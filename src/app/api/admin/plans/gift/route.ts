import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyAdminRequest } from '@/src/lib/serverAdminAuth';
import { serverAdminSupabase } from '@/src/lib/serverSupabase';

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyAdminRequest(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Admin authentication required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, plan_id, credit_referral = true } = body;

    if (!user_id || !plan_id) {
      return NextResponse.json({ ok: false, error: 'User ID and Plan ID are required.' }, { status: 400 });
    }

    // 1. Fetch user profile
    const { data: userProfile, error: userErr } = await serverAdminSupabase
      .from('profiles')
      .select('id, username, email, phone, referred_by')
      .eq('id', user_id)
      .maybeSingle();

    if (userErr || !userProfile) {
      return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 });
    }

    // 2. Fetch plan details
    const { data: plan, error: planErr } = await serverAdminSupabase
      .from('plans')
      .select('*')
      .eq('id', plan_id)
      .maybeSingle();

    if (planErr || !plan) {
      return NextResponse.json({ ok: false, error: 'Plan not found.' }, { status: 404 });
    }

    const durationDays = Number(plan.duration_days || plan.total_days || 30);
    const dailyReward = Number(plan.daily_reward || plan.daily_return || 20);
    const planName = plan.name || `Plan #${plan.plan_number || 1}`;
    const newPlanId = crypto.randomUUID();
    const startDate = new Date();
    const startDateIso = startDate.toISOString();

    // 3. Create active user_plans record
    const { error: upErr } = await serverAdminSupabase
      .from('user_plans')
      .insert({
        id: newPlanId,
        user_id: user_id,
        plan_id: plan.id,
        status: 'active',
        start_date: startDateIso,
        approved_at: startDateIso,
        created_at: startDateIso,
        sender_account_name: 'Admin Direct Gift',
        sender_account_number: 'ADMIN_GIFT',
        receipt_image_url: 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp',
      });

    if (upErr) {
      console.error('Admin gift plan insertion error:', upErr);
      return NextResponse.json({ ok: false, error: 'Failed to create user plan: ' + upErr.message }, { status: 500 });
    }

    // 4. Generate daily rewards (Day 1 available immediately at 0h)
    const rewards = [];
    for (let day = 1; day <= durationDays; day++) {
      const availableAt = new Date(startDate.getTime() + (day - 1) * 24 * 60 * 60 * 1000).toISOString();
      rewards.push({
        user_plan_id: newPlanId,
        user_id: user_id,
        day_number: day,
        reward_amount: dailyReward,
        status: 'pending',
        available_at: availableAt,
      });
    }

    const { error: rewErr } = await serverAdminSupabase
      .from('daily_rewards')
      .upsert(rewards, { onConflict: 'user_plan_id,day_number' });

    if (rewErr) {
      console.warn('Daily rewards creation warning:', rewErr.message);
    }

    // 5. Optionally credit referrer if applicable
    if (credit_referral && userProfile.referred_by) {
      try {
        const { data: refBonusSetting } = await serverAdminSupabase
          .from('app_settings')
          .select('setting_value')
          .eq('setting_key', 'referral_bonus')
          .maybeSingle();

        const bonusAmount = Number(refBonusSetting?.setting_value || 50);

        const { data: referrer } = await serverAdminSupabase
          .from('profiles')
          .select('id, balance')
          .eq('referral_code', userProfile.referred_by)
          .maybeSingle();

        if (referrer) {
          await serverAdminSupabase
            .from('profiles')
            .update({ balance: Number(referrer.balance || 0) + bonusAmount })
            .eq('id', referrer.id);

          await serverAdminSupabase
            .from('transactions')
            .insert({
              user_id: referrer.id,
              amount: bonusAmount,
              type: 'referral_bonus',
              description: `Referral bonus from member ${userProfile.username || 'user'}'s gifted plan`,
            });
        }
      } catch (refErr) {
        console.warn('Referral bonus credit warning:', refErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Plan "${planName}" gifted to ${userProfile.username || 'user'} successfully!`,
      user_plan_id: newPlanId,
      plan_name: planName,
      duration_days: durationDays,
    });
  } catch (err: any) {
    console.error('API /api/admin/plans/gift error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
