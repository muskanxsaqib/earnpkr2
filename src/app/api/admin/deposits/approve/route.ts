import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/src/lib/serverAdminAuth';
import { serverAdminSupabase } from '@/src/lib/serverSupabase';

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyAdminRequest(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { deposit_id } = body;

    if (!deposit_id) {
      return NextResponse.json({ ok: false, error: 'Deposit ID is required.' }, { status: 400 });
    }

    // 1. Fetch deposit
    const { data: deposit, error: depErr } = await serverAdminSupabase
      .from('deposits')
      .select('*, plans(*)')
      .eq('id', deposit_id)
      .single();

    if (depErr || !deposit) {
      return NextResponse.json({ ok: false, error: 'Deposit not found.' }, { status: 404 });
    }

    if (deposit.status === 'approved') {
      return NextResponse.json({ ok: false, error: 'Deposit has already been approved.' }, { status: 400 });
    }

    const plan = deposit.plans;
    const dailyReward = Number(plan?.daily_reward || 20);
    const startDate = new Date();
    const startDateIso = startDate.toISOString();

    // 2. Mark deposit approved (safe with or without approved_at column)
    const { error: markErr } = await serverAdminSupabase
      .from('deposits')
      .update({ status: 'approved', approved_at: startDateIso })
      .eq('id', deposit_id);

    if (markErr) {
      await serverAdminSupabase
        .from('deposits')
        .update({ status: 'approved' })
        .eq('id', deposit_id);
    }

    // 3. Upsert user_plans record (safe with all NOT NULL database columns)
    const receiptUrl = deposit.screenshot_url || deposit.receipt_url || 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp';
    const senderName = deposit.user_account_name || deposit.sender_name || 'Direct Deposit';
    const senderNumber = deposit.user_account_number || deposit.sender_account || 'N/A';

    const { data: userPlan, error: upErr } = await serverAdminSupabase
      .from('user_plans')
      .upsert({
        id: deposit_id,
        user_id: deposit.user_id,
        plan_id: deposit.plan_id,
        status: 'active',
        start_date: startDateIso,
        approved_at: startDateIso,
        created_at: startDateIso,
        sender_account_name: senderName,
        sender_account_number: senderNumber,
        receipt_image_url: receiptUrl,
        admin_payment_method_id: deposit.platform_method_id || null,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (upErr) {
      console.error('Error activating user plan:', upErr);
    }

    // 4. Generate 30 daily reward rows (Day 1 instant at 0h; Day N at (N - 1) * 24h)
    const rewards = [];
    for (let day = 1; day <= 30; day++) {
      const availableAt = new Date(startDate.getTime() + (day - 1) * 24 * 60 * 60 * 1000).toISOString();
      rewards.push({
        user_plan_id: deposit_id,
        user_id: deposit.user_id,
        day_number: day,
        reward_amount: dailyReward,
        status: 'pending',
        available_at: availableAt,
      });
    }

    await serverAdminSupabase
      .from('daily_rewards')
      .upsert(rewards, { onConflict: 'user_plan_id,day_number' });

    // 5. Credit Referrer Bonus if applicable
    const { data: userProfile } = await serverAdminSupabase
      .from('profiles')
      .select('referred_by')
      .eq('id', deposit.user_id)
      .single();

    if (userProfile?.referred_by) {
      // Find referrer
      const { data: referrer } = await serverAdminSupabase
        .from('profiles')
        .select('id, balance, total_earnings')
        .eq('referral_code', userProfile.referred_by)
        .maybeSingle();

      if (referrer) {
        // Read referral bonus amount from app_settings (default 50 PKR)
        const { data: refSetting } = await serverAdminSupabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'referral_bonus')
          .maybeSingle();

        const refBonus = Number(refSetting?.setting_value || 50);
        if (refBonus > 0) {
          await serverAdminSupabase
            .from('profiles')
            .update({
              balance: Number(referrer.balance || 0) + refBonus,
              total_earnings: Number(referrer.total_earnings || 0) + refBonus,
            })
            .eq('id', referrer.id);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Deposit approved! Plan #${plan?.plan_number || ''} is now active with Day 1 instant reward unlocked.`,
      deposit_id,
      user_id: deposit.user_id,
    });
  } catch (err: any) {
    console.error('API /api/admin/deposits/approve error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error approving deposit.' }, { status: 500 });
  }
}
