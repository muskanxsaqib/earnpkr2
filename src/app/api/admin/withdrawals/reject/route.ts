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
    const { withdrawal_id, rejection_reason } = body;

    if (!withdrawal_id) {
      return NextResponse.json({ ok: false, error: 'Withdrawal ID is required.' }, { status: 400 });
    }

    // 1. Fetch withdrawal record
    const { data: withdrawal, error: fetchErr } = await serverAdminSupabase
      .from('withdrawals')
      .select('*')
      .eq('id', withdrawal_id)
      .single();

    if (fetchErr || !withdrawal) {
      return NextResponse.json({ ok: false, error: 'Withdrawal record not found.' }, { status: 404 });
    }

    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ ok: false, error: `Cannot reject withdrawal with status "${withdrawal.status}".` }, { status: 400 });
    }

    // 2. Mark withdrawal as rejected (with safe fallback for processed_at)
    const { error: rejErr } = await serverAdminSupabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        rejection_reason: rejection_reason || 'Rejected by administrator. Balance has been refunded.',
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawal_id);

    if (rejErr) {
      await serverAdminSupabase
        .from('withdrawals')
        .update({
          status: 'rejected',
          rejection_reason: rejection_reason || 'Rejected by administrator. Balance has been refunded.',
        })
        .eq('id', withdrawal_id);
    }

    // 3. REFUND user's deducted balance!
    const refundAmount = Number(withdrawal.amount || 0);
    if (refundAmount > 0 && withdrawal.user_id) {
      const { data: userProfile } = await serverAdminSupabase
        .from('profiles')
        .select('balance')
        .eq('id', withdrawal.user_id)
        .single();

      if (userProfile) {
        const refundedBalance = Number(userProfile.balance || 0) + refundAmount;
        await serverAdminSupabase
          .from('profiles')
          .update({ balance: refundedBalance })
          .eq('id', withdrawal.user_id);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Withdrawal rejected and PKR ${refundAmount} refunded back to user wallet.`,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
