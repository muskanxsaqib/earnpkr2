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
    const { withdrawal_id } = body;

    if (!withdrawal_id) {
      return NextResponse.json({ ok: false, error: 'Withdrawal ID is required.' }, { status: 400 });
    }

    let { error } = await serverAdminSupabase
      .from('withdrawals')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
      })
      .eq('id', withdrawal_id);

    if (error) {
      // Fallback if processed_at is not available
      const fb = await serverAdminSupabase
        .from('withdrawals')
        .update({ status: 'approved' })
        .eq('id', withdrawal_id);
      error = fb.error;
    }

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Withdrawal request approved successfully.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
