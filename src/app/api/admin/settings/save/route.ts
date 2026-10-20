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
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ ok: false, error: 'Settings object is required.' }, { status: 400 });
    }

    const upsertRows = Object.keys(settings).map((key) => ({
      setting_key: key,
      setting_value: String(settings[key] ?? ''),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await serverAdminSupabase
      .from('app_settings')
      .upsert(upsertRows, { onConflict: 'setting_key' });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: 'App settings saved successfully using service role key.',
      count: upsertRows.length,
    });
  } catch (err: any) {
    console.error('API /api/admin/settings/save error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
