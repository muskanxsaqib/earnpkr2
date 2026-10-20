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
    const { plan, metaMap } = body;

    if (!plan || !plan.name) {
      return NextResponse.json({ ok: false, error: 'Valid plan name is required.' }, { status: 400 });
    }

    const priceVal = Number(plan.price ?? plan.plan_price ?? plan.invest_amount ?? 0);
    const dailyVal = Number(plan.daily_reward ?? plan.daily_return ?? 0);
    const daysVal = Number(plan.duration_days ?? plan.total_days ?? 30);
    const reqMembers = Number(plan.members_required ?? plan.required_referrals ?? 0);
    const userTot = Number(plan.user_total_reward ?? (dailyVal * daysVal + reqMembers * 50));

    let planNum = plan.plan_number ? Number(plan.plan_number) : undefined;
    if (!planNum && !plan.id) {
      const { data: maxRow } = await serverAdminSupabase
        .from('plans')
        .select('plan_number')
        .order('plan_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      planNum = ((maxRow?.plan_number) || 0) + 1;
    }

    const payload: any = {
      name: plan.name,
      price: priceVal,
      plan_price: priceVal,
      invest_amount: priceVal,
      daily_reward: dailyVal,
      daily_return: dailyVal,
      duration_days: daysVal,
      total_days: daysVal,
      thirty_day_reward: dailyVal * daysVal,
      members_required: reqMembers,
      required_referrals: reqMembers,
      user_total_reward: userTot,
      is_active: plan.is_active !== false,
      icon: plan.icon || 'flame',
      theme_key: plan.theme_key || plan.themeKey || 'purple',
    };

    if (planNum) {
      payload.plan_number = planNum;
    }

    let savedPlan = null;

    if (plan.id) {
      const { data, error } = await serverAdminSupabase
        .from('plans')
        .update(payload)
        .eq('id', plan.id)
        .select()
        .maybeSingle();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      savedPlan = data;
    } else {
      const { data, error } = await serverAdminSupabase
        .from('plans')
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      savedPlan = data;
    }

    // Merge badge_tag and metadata into metaMap and persist in app_settings.plans_meta_json
    const finalMetaMap = { ...(metaMap || {}) };
    if (planNum) {
      finalMetaMap[String(planNum)] = {
        ...(finalMetaMap[String(planNum)] || {}),
        name: plan.name,
        icon: plan.icon || 'flame',
        themeKey: plan.theme_key || plan.themeKey || 'purple',
        total_days: daysVal,
        is_active: plan.is_active !== false,
        badge_tag: (plan.badge_tag || '').trim(),
      };
    }

    await serverAdminSupabase
      .from('app_settings')
      .upsert({
        setting_key: 'plans_meta_json',
        setting_value: JSON.stringify(finalMetaMap),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' });

    return NextResponse.json({
      ok: true,
      message: 'Plan saved successfully via service role.',
      plan: savedPlan,
    });
  } catch (err: any) {
    console.error('API /api/admin/plans/save error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
