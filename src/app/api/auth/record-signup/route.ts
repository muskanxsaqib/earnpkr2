import { NextResponse } from 'next/server';
import { serverAdminSupabase, getClientIp } from '@/src/lib/serverSupabase';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { user_id, device_id, ip } = body;
    const clientIp = getClientIp(req);

    if (!user_id) {
      return NextResponse.json({ ok: false, error: 'User ID is required.' }, { status: 400 });
    }

    const effectiveIp = clientIp !== '127.0.0.1' ? clientIp : (ip || '127.0.0.1');

    const updatePayload: Record<string, any> = {
      last_ip: effectiveIp,
    };
    if (device_id) {
      updatePayload.device_id = device_id;
    }

    const { error: updateErr } = await serverAdminSupabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user_id);

    if (updateErr) {
      console.warn('Could not update profile with device/ip in record-signup:', updateErr);
    }

    return NextResponse.json({ ok: true, ip: effectiveIp });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
