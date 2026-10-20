import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/src/lib/serverAdminAuth';
import { serverAdminSupabase } from '@/src/lib/serverSupabase';

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyAdminRequest(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    let { title, message, is_broadcast, user_id, sender_id } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ ok: false, error: 'Message content is required.' }, { status: 400 });
    }

    // Ensure valid sender_id if table requires NOT NULL
    if (!sender_id) {
      const { data: adminUser } = await serverAdminSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (adminUser?.id) {
        sender_id = adminUser.id;
      } else {
        const { data: anyUser } = await serverAdminSupabase
          .from('profiles')
          .select('id')
          .limit(1)
          .maybeSingle();
        sender_id = anyUser?.id || null;
      }
    }

    const payload: any = {
      sender_id,
      title: title ? title.trim() : 'Platform Notification',
      message: message.trim(),
      is_broadcast: Boolean(is_broadcast),
      user_id: is_broadcast ? null : user_id,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await serverAdminSupabase
      .from('admin_messages')
      .insert(payload)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Message broadcasted successfully.',
      data,
    });
  } catch (err: any) {
    console.error('API /api/admin/messages/send error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
