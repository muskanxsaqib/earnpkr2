import { NextResponse } from 'next/server';
import { getAuthenticatedUser, serverAdminSupabase } from '@/src/lib/serverSupabase';

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_plan_id, day_number } = body;

    const dayNum = parseInt(day_number, 10);
    if (!user_plan_id || isNaN(dayNum) || dayNum < 1 || dayNum > 30) {
      return NextResponse.json({ ok: false, error: 'Invalid plan or day number.' }, { status: 400 });
    }

    // 1. Fetch user profile to ensure not banned
    const { data: profile, error: profileErr } = await serverAdminSupabase
      .from('profiles')
      .select('id, balance, total_earnings, referral_code, is_banned, status')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 });
    }

    if (profile.is_banned || profile.status === 'banned') {
      return NextResponse.json({ ok: false, error: 'Account is suspended.' }, { status: 403 });
    }

    // 2. Fetch the user plan and verify ownership
    const { data: userPlan, error: planErr } = await serverAdminSupabase
      .from('user_plans')
      .select('id, user_id, plan_id, status, start_date, plans(*)')
      .eq('id', user_plan_id)
      .eq('user_id', user.id)
      .single();

    if (planErr || !userPlan) {
      return NextResponse.json({ ok: false, error: 'Active user plan not found.' }, { status: 404 });
    }

    if (userPlan.status !== 'active') {
      return NextResponse.json({ ok: false, error: 'This plan is not currently active.' }, { status: 400 });
    }

    const planData: any = userPlan.plans;
    const rewardAmount = Number(planData?.daily_reward || 0);
    const membersRequired = Number(planData?.members_required || 0);

    if (rewardAmount <= 0) {
      return NextResponse.json({ ok: false, error: 'Plan reward configuration is invalid.' }, { status: 400 });
    }

    // 3. Verify Timing (Day 1 is instant; Day N available at start_date + (N - 1) * 24h)
    const startDate = userPlan.start_date ? new Date(userPlan.start_date) : new Date();
    const now = Date.now();
    const availableAtTime = startDate.getTime() + (dayNum - 1) * 24 * 60 * 60 * 1000;

    if (now < availableAtTime) {
      const waitMs = availableAtTime - now;
      const waitHours = Math.ceil(waitMs / (1000 * 60 * 60));
      return NextResponse.json({
        ok: false,
        error: `Day ${dayNum} reward is not unlocked yet. Please wait approximately ${waitHours} hour(s).`,
      }, { status: 400 });
    }

    // 4. Verify Referral Requirement against free_reward_days setting
    const { data: settingsRows } = await serverAdminSupabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['free_reward_days']);

    let freeRewardDays = 1;
    if (settingsRows && settingsRows.length > 0) {
      const parsed = parseInt(settingsRows[0].setting_value, 10);
      if (!isNaN(parsed) && parsed >= 0) freeRewardDays = parsed;
    }

    if (dayNum > freeRewardDays && membersRequired > 0) {
      // Check user's verified referrals who have an active/approved plan
      const { data: referrals, error: refErr } = await serverAdminSupabase
        .from('profiles')
        .select('id, user_plans(status)')
        .eq('referred_by', profile.referral_code);

      const activeReferralCount = (referrals || []).filter((r: any) =>
        r.user_plans && r.user_plans.some((up: any) => up.status === 'active')
      ).length;

      if (activeReferralCount < membersRequired) {
        return NextResponse.json({
          ok: false,
          error: `Day ${dayNum} locked: This plan requires ${membersRequired} active referral(s). You currently have ${activeReferralCount}.`,
        }, { status: 400 });
      }
    }

    // 5. Check if already collected in daily_rewards
    const { data: existingReward } = await serverAdminSupabase
      .from('daily_rewards')
      .select('id, status')
      .eq('user_plan_id', user_plan_id)
      .eq('day_number', dayNum)
      .maybeSingle();

    if (existingReward && existingReward.status === 'collected') {
      return NextResponse.json({
        ok: false,
        error: `Day ${dayNum} reward has already been claimed!`,
      }, { status: 400 });
    }

    // 6. Record reward as collected in daily_rewards
    const nowIso = new Date().toISOString();
    if (existingReward) {
      await serverAdminSupabase
        .from('daily_rewards')
        .update({
          status: 'collected',
          collected_at: nowIso,
          reward_amount: rewardAmount,
        })
        .eq('id', existingReward.id);
    } else {
      await serverAdminSupabase
        .from('daily_rewards')
        .insert({
          user_plan_id,
          user_id: user.id,
          day_number: dayNum,
          reward_amount: rewardAmount,
          status: 'collected',
          collected_at: nowIso,
          available_at: new Date(availableAtTime).toISOString(),
        });
    }

    // 7. Atomically increment profile balance
    const currentBalance = Number(profile.balance || 0);
    const currentEarnings = Number(profile.total_earnings || 0);
    const newBalance = currentBalance + rewardAmount;
    const newEarnings = currentEarnings + rewardAmount;

    await serverAdminSupabase
      .from('profiles')
      .update({
        balance: newBalance,
        total_earnings: newEarnings,
      })
      .eq('id', user.id);

    return NextResponse.json({
      ok: true,
      message: `Day ${dayNum} reward (PKR ${rewardAmount}) collected successfully!`,
      day_number: dayNum,
      amount: rewardAmount,
      new_balance: newBalance,
    });
  } catch (err: any) {
    console.error('API /api/rewards/claim error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error claiming reward.' }, { status: 500 });
  }
}
