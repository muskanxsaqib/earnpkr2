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
    const { user_id, new_balance, reason } = body;

    const balanceNum = parseFloat(new_balance);
    if (!user_id || isNaN(balanceNum) || balanceNum < 0) {
      return NextResponse.json({ ok: false, error: 'Valid User ID and positive balance amount required.' }, { status: 400 });
    }

    const { error } = await serverAdminSupabase
      .from('profiles')
      .update({ balance: balanceNum })
      .eq('id', user_id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: `User balance updated to PKR ${balanceNum.toLocaleString()}.`,
      user_id,
      new_balance: balanceNum,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
