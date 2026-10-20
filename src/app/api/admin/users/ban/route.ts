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
    const { user_id, is_banned, ban_reason } = body;

    if (!user_id) {
      return NextResponse.json({ ok: false, error: 'User ID is required.' }, { status: 400 });
    }

    const { error } = await serverAdminSupabase
      .from('profiles')
      .update({
        is_banned: Boolean(is_banned),
        status: is_banned ? 'banned' : 'active',
        ban_reason: is_banned ? (ban_reason || 'Account suspended by administrator.') : null,
      })
      .eq('id', user_id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: is_banned ? 'User has been banned.' : 'User has been unbanned.',
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
