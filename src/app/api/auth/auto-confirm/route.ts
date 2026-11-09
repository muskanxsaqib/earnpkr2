import { NextResponse } from 'next/server';
import { serverAdminSupabase } from '@/src/lib/serverSupabase';

export async function POST(req: Request) {
  try {
    const { email } = await req.json().catch(() => ({}));
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json({ ok: false, error: 'Email is required' }, { status: 400 });
    }

    // Find the user by email in auth.users
    const { data: list, error: listErr } = await serverAdminSupabase.auth.admin.listUsers();
    if (listErr) {
      return NextResponse.json({ ok: false, error: listErr.message }, { status: 500 });
    }

    const targetUser = list.users.find((u) => u.email?.toLowerCase() === cleanEmail);
    if (!targetUser) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    // Update user to mark email_confirm: true
    const { error: updateErr } = await serverAdminSupabase.auth.admin.updateUserById(targetUser.id, {
      email_confirm: true,
    });

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Email confirmed successfully' });
  } catch (err: any) {
    console.error('API /api/auth/auto-confirm error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
