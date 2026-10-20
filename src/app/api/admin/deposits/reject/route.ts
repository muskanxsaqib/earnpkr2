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
    const { deposit_id, rejection_reason } = body;

    if (!deposit_id) {
      return NextResponse.json({ ok: false, error: 'Deposit ID is required.' }, { status: 400 });
    }

    const { error } = await serverAdminSupabase
      .from('deposits')
      .update({
        status: 'rejected',
        rejection_reason: rejection_reason || 'Rejected by administrator.',
      })
      .eq('id', deposit_id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Deposit has been rejected.' });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
