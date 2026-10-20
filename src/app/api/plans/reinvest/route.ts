import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { serverAdminSupabase } from '@/src/lib/serverSupabase';
import { sanitizeInputString } from '@/src/lib/cryptoSecurity';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Authentication token required.' }, { status: 401 });
    }

    // 1. Verify user session
    const { data: { user }, error: authErr } = await serverAdminSupabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired session. Please re-login.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawPlanId = body?.plan_id;

    if (!rawPlanId) {
      return NextResponse.json({ ok: false, error: 'Plan ID is required.' }, { status: 400 });
    }

    const plan_id = typeof rawPlanId === 'string' ? sanitizeInputString(rawPlanId) : rawPlanId;

    // 2. Fetch User Profile & Balance
    const { data: profile, error: profErr } = await serverAdminSupabase
      .from('profiles')
      .select('id, username, email, phone, balance, referred_by, is_banned')
      .eq('id', user.id)
      .single();

    if (profErr || !profile) {
      return NextResponse.json({ ok: false, error: 'User profile not found.' }, { status: 404 });
    }

    if (profile.is_banned) {
      return NextResponse.json({ ok: false, error: 'Your account has been suspended.' }, { status: 403 });
    }

    // 3. Fetch Plan details (by database id or plan_number)
    let plan = null;
    if (typeof plan_id === 'number' || !isNaN(Number(plan_id))) {
      const { data: pById } = await serverAdminSupabase
        .from('plans')
        .select('*')
        .eq('id', Number(plan_id))
        .maybeSingle();

      if (pById) {
        plan = pById;
      } else {
        const { data: pByNum } = await serverAdminSupabase
          .from('plans')
          .select('*')
          .eq('plan_number', Number(plan_id))
          .maybeSingle();
        plan = pByNum;
      }
    } else {
      const cleanNum = parseInt(String(plan_id).replace(/\D/g, ''), 10);
      if (!isNaN(cleanNum)) {
        const { data: pByNum } = await serverAdminSupabase
          .from('plans')
          .select('*')
          .eq('plan_number', cleanNum)
          .maybeSingle();
        plan = pByNum;
      }
    }

    if (!plan) {
      return NextResponse.json({ ok: false, error: 'Specified plan not found.' }, { status: 404 });
    }

    const planPrice = Number(plan.price || plan.plan_price || plan.invest_amount || 0);
    const userBalance = Number(profile.balance || 0);

    if (userBalance < planPrice) {
      return NextResponse.json({
        ok: false,
        error: `Insufficient balance. Required: Rs ${planPrice}, Available: Rs ${userBalance}. Please deposit or choose another plan.`,
      }, { status: 400 });
    }

    const durationDays = Number(plan.duration_days || plan.total_days || 30);
    const dailyReward = Number(plan.daily_reward || plan.daily_return || 20);
    const planName = plan.name || `Plan #${plan.plan_number}`;
    const newBalance = userBalance - planPrice;

    // 4. Deduct balance from user profile with atomic balance protection
    const { data: updatedProfile, error: balanceErr } = await serverAdminSupabase
      .from('profiles')
      .update({ balance: newBalance })
      .eq('id', user.id)
      .gte('balance', planPrice)
      .select('balance')
      .maybeSingle();

    if (balanceErr || !updatedProfile) {
      return NextResponse.json({ ok: false, error: 'Insufficient balance or concurrent transaction in progress.' }, { status: 400 });
    }

    // 5. Record transaction
    await serverAdminSupabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: -planPrice,
        type: 'plan_purchase',
        description: `Plan activated via wallet balance: ${planName}`,
      });

    // 6. Create active user_plans record
    const newPlanId = crypto.randomUUID();
    const startDate = new Date();
    const startDateIso = startDate.toISOString();

    const { error: upErr } = await serverAdminSupabase
      .from('user_plans')
      .insert({
        id: newPlanId,
        user_id: user.id,
        plan_id: plan.id,
        status: 'active',
        start_date: startDateIso,
        approved_at: startDateIso,
        created_at: startDateIso,
        sender_account_name: 'Wallet Balance Re-invest',
        sender_account_number: 'WALLET_BALANCE',
        receipt_image_url: 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp',
      });

    if (upErr) {
      console.error('Reinvest user plan activation error:', upErr);
      // Attempt refund if user_plans failed
      await serverAdminSupabase.from('profiles').update({ balance: userBalance }).eq('id', user.id);
      return NextResponse.json({ ok: false, error: 'Failed to activate plan: ' + upErr.message }, { status: 500 });
    }

    // 7. Generate daily rewards (Day 1 instant at 0h)
    const rewards = [];
    for (let day = 1; day <= durationDays; day++) {
      const availableAt = new Date(startDate.getTime() + (day - 1) * 24 * 60 * 60 * 1000).toISOString();
      rewards.push({
        user_plan_id: newPlanId,
        user_id: user.id,
        day_number: day,
        reward_amount: dailyReward,
        status: 'pending',
        available_at: availableAt,
      });
    }

    await serverAdminSupabase
      .from('daily_rewards')
      .upsert(rewards, { onConflict: 'user_plan_id,day_number' });

    // 8. Referrer bonus crediting
    if (profile.referred_by) {
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
          .eq('referral_code', profile.referred_by)
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
              description: `Referral bonus from invited member ${profile.username}'s balance plan activation`,
            });
        }
      } catch (refErr) {
        console.warn('Referral bonus credit warning in reinvest:', refErr);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Plan "${planName}" activated successfully using wallet balance!`,
      newBalance,
      plan_name: planName,
      user_plan_id: newPlanId,
      duration_days: durationDays,
    });
  } catch (err: any) {
    console.error('API /api/plans/reinvest error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
