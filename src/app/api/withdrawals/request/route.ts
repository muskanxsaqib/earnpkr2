import { NextResponse } from 'next/server';
import { getAuthenticatedUser, serverAdminSupabase } from '@/src/lib/serverSupabase';
import { sanitizeInputString, assertValidPositiveInt } from '@/src/lib/cryptoSecurity';
import {
  parseWithdrawalRuleConfig,
  checkWithdrawalScheduleOpen,
  calculateWithdrawalBreakdown,
} from '@/src/lib/platformFeatures';

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { amount, method, account_number, account_name } = body;

    let withdrawAmount: number;
    try {
      withdrawAmount = assertValidPositiveInt(amount, 1, 10000000);
    } catch (valErr: any) {
      return NextResponse.json({ ok: false, error: valErr?.message || 'Please enter a valid withdrawal amount.' }, { status: 400 });
    }

    const cleanAccNumber = sanitizeInputString(String(account_number || ''));
    const cleanAccName = sanitizeInputString(String(account_name || ''));
    const cleanMethod = sanitizeInputString(String(method || 'EasyPaisa'));

    if (!cleanAccNumber) {
      return NextResponse.json({ ok: false, error: 'Account / Mobile number is required.' }, { status: 400 });
    }

    if (!cleanAccName) {
      return NextResponse.json({ ok: false, error: 'Account title / holder name is required.' }, { status: 400 });
    }

    // 1. Check profile status & balance
    const { data: profile, error: profileErr } = await serverAdminSupabase
      .from('profiles')
      .select('id, balance, is_banned, status')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 });
    }

    if (profile.is_banned || profile.status === 'banned') {
      return NextResponse.json({ ok: false, error: 'Account is suspended.' }, { status: 403 });
    }

    // 2. Prevent duplicate pending requests
    const { count: pendingCount } = await serverAdminSupabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if ((pendingCount || 0) > 0) {
      return NextResponse.json({
        ok: false,
        error: 'You already have an active pending withdrawal request. Please wait until it is processed.',
      }, { status: 400 });
    }

    // 3. Load withdrawal configuration from database
    const { data: settingsRows } = await serverAdminSupabase
      .from('app_settings')
      .select('setting_key, setting_value');

    const settingsMap: Record<string, string> = {};
    (settingsRows || []).forEach((row: any) => {
      settingsMap[row.setting_key] = row.setting_value;
    });

    const withdrawConfig = parseWithdrawalRuleConfig(settingsMap);

    // 4. Validate Withdrawal Schedule / Operating Hours
    const scheduleStatus = checkWithdrawalScheduleOpen(withdrawConfig);
    if (!scheduleStatus.isOpen) {
      return NextResponse.json({
        ok: false,
        error: scheduleStatus.reason,
      }, { status: 400 });
    }

    // 5. Validate Minimum & Maximum Limits
    if (withdrawAmount < withdrawConfig.min_withdraw_amount) {
      return NextResponse.json({
        ok: false,
        error: `Minimum withdrawal amount is ${withdrawConfig.min_withdraw_amount} PKR.`,
      }, { status: 400 });
    }

    if (withdrawConfig.withdrawal_rules_enabled && withdrawAmount > withdrawConfig.max_withdraw_amount) {
      return NextResponse.json({
        ok: false,
        error: `Maximum single withdrawal limit is ${withdrawConfig.max_withdraw_amount.toLocaleString()} PKR.`,
      }, { status: 400 });
    }

    // 6. Verify User Balance
    const currentBalance = Number(profile.balance || 0);
    if (withdrawAmount > currentBalance) {
      return NextResponse.json({
        ok: false,
        error: `Insufficient balance. Your current balance is ${currentBalance.toFixed(2)} PKR.`,
      }, { status: 400 });
    }

    // 7. Calculate Fees & Net Receivable
    const breakdown = calculateWithdrawalBreakdown(withdrawAmount, withdrawConfig);
    const enrichedAccountName =
      breakdown.totalFee > 0
        ? `${cleanAccName} (Net: Rs ${breakdown.netReceivable} | Fee: Rs ${breakdown.totalFee})`
        : cleanAccName;

    // 8. Deduct balance from profile with atomic race condition check
    const newBalance = currentBalance - withdrawAmount;
    const { data: updatedProfile, error: balanceUpdateErr } = await serverAdminSupabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id)
      .gte('balance', withdrawAmount)
      .select('balance')
      .maybeSingle();

    if (balanceUpdateErr || !updatedProfile) {
      return NextResponse.json({ ok: false, error: 'Insufficient balance or concurrent transaction detected. Please refresh.' }, { status: 400 });
    }

    // 9. Insert into withdrawals record
    const { data: newWithdrawal, error: insertErr } = await serverAdminSupabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount: withdrawAmount,
        method: cleanMethod,
        account_number: cleanAccNumber,
        account_name: enrichedAccountName,
        status: 'pending',
      })
      .select('id, created_at')
      .single();

    if (insertErr) {
      // Revert balance in case of failure
      await serverAdminSupabase.from('profiles').update({ balance: currentBalance }).eq('id', user.id);
      return NextResponse.json({ ok: false, error: 'Failed to submit withdrawal request.' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Withdrawal request submitted successfully! Funds will be transferred after admin review.',
      withdrawal_id: newWithdrawal.id,
      requested_amount: withdrawAmount,
      fee: breakdown.totalFee,
      net_receivable: breakdown.netReceivable,
      new_balance: newBalance,
    });
  } catch (err: any) {
    console.error('API /api/withdrawals/request error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error processing withdrawal.' }, { status: 500 });
  }
}
