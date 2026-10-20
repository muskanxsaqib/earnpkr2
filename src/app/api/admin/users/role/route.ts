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
    const { user_id, role } = body;

    if (!user_id || !role) {
      return NextResponse.json({ ok: false, error: 'User ID and target role are required.' }, { status: 400 });
    }

    // Protect superadmin account
    const { data: targetUser } = await serverAdminSupabase
      .from('profiles')
      .select('email')
      .eq('id', user_id)
      .single();

    if (targetUser?.email === 'saqib242saqib@gmail.com' && role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'This super admin account cannot be demoted.' }, { status: 400 });
    }

    const { error } = await serverAdminSupabase
      .from('profiles')
      .update({ role })
      .eq('id', user_id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: `User role updated to "${role}".` });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
