import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/src/lib/serverAdminAuth';
import { serverAdminSupabase } from '@/src/lib/serverSupabase';
import { OFFICIAL_PLANS_MATRIX } from '@/src/lib/economics';

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyAdminRequest(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const { data: existingPlans } = await serverAdminSupabase
      .from('plans')
      .select('id, plan_number');

    const existingMap = new Map<number, string>();
    (existingPlans || []).forEach((p: any) => {
      if (p.plan_number) existingMap.set(p.plan_number, p.id);
    });

    for (const p of OFFICIAL_PLANS_MATRIX) {
      const corePayload = {
        name: p.name,
        price: p.plan_price,
        daily_reward: p.daily_reward,
        duration_days: p.total_days,
        plan_number: p.plan_number,
        members_required: p.members_required,
        user_total_reward: p.user_total_reward,
      };

      const existingId = existingMap.get(p.plan_number);
      if (existingId) {
        await serverAdminSupabase.from('plans').update(corePayload).eq('id', existingId);
      } else {
        await serverAdminSupabase.from('plans').insert(corePayload);
      }
    }

    // Clear custom meta json
    await serverAdminSupabase
      .from('app_settings')
      .upsert({
        setting_key: 'plans_meta_json',
        setting_value: '{}',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' });

    return NextResponse.json({
      ok: true,
      message: 'Official 10-plan economic matrix restored successfully.',
    });
  } catch (err: any) {
    console.error('API /api/admin/plans/reset error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
