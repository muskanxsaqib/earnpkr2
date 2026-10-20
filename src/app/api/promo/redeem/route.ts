import { NextResponse } from 'next/server';
import { getAuthenticatedUser, serverAdminSupabase } from '@/src/lib/serverSupabase';
import { PromoCodeItem, PromoClaimRecord } from '@/src/lib/platformFeatures';

export async function POST(req: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(req);
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: authError || 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const cleanCode = String(body?.code || '').trim().toUpperCase();

    if (!cleanCode) {
      return NextResponse.json({ ok: false, error: 'Please enter a Promo / Gift code.' }, { status: 400 });
    }

    // 1. Fetch user profile
    const { data: profile, error: profileErr } = await serverAdminSupabase
      .from('profiles')
      .select('id, username, balance, total_earnings, is_banned, status')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return NextResponse.json({ ok: false, error: 'Profile not found.' }, { status: 404 });
    }

    if (profile.is_banned || profile.status === 'banned') {
      return NextResponse.json({ ok: false, error: 'Account is suspended.' }, { status: 403 });
    }

    // 2. Fetch promo settings from database
    const { data: settingsRows } = await serverAdminSupabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['promo_feature_enabled', 'promo_codes_json', 'promo_claims_json']);

    const settingsMap: Record<string, string> = {};
    (settingsRows || []).forEach((row: any) => {
      settingsMap[row.setting_key] = row.setting_value;
    });

    if (settingsMap['promo_feature_enabled'] !== 'true') {
      return NextResponse.json({ ok: false, error: 'Promo / Gift codes are currently disabled by Admin.' }, { status: 400 });
    }

    let codes: PromoCodeItem[] = [];
    try {
      codes = JSON.parse(settingsMap['promo_codes_json'] || '[]');
    } catch {
      codes = [];
    }

    const targetPromo = codes.find((c) => c.code.trim().toUpperCase() === cleanCode);
    if (!targetPromo || targetPromo.is_active === false) {
      return NextResponse.json({ ok: false, error: 'Invalid or inactive promo code.' }, { status: 400 });
    }

    // Expiry check
    if (targetPromo.expires_at) {
      const expTime = new Date(targetPromo.expires_at).getTime();
      if (!isNaN(expTime) && expTime < Date.now()) {
        return NextResponse.json({ ok: false, error: 'This promo code has expired.' }, { status: 400 });
      }
    }

    let claims: PromoClaimRecord[] = [];
    try {
      claims = JSON.parse(settingsMap['promo_claims_json'] || '[]');
    } catch {
      claims = [];
    }

    // Already claimed check
    const hasAlreadyClaimed = claims.some(
      (c) => c.user_id === user.id && c.code.toUpperCase() === cleanCode
    );
    if (hasAlreadyClaimed) {
      return NextResponse.json({ ok: false, error: 'You have already redeemed this promo code.' }, { status: 400 });
    }

    // Max uses check
    const totalUses = claims.filter((c) => c.code.toUpperCase() === cleanCode).length;
    if (targetPromo.max_uses > 0 && totalUses >= targetPromo.max_uses) {
      return NextResponse.json({ ok: false, error: 'This promo code has reached its maximum redemption limit.' }, { status: 400 });
    }

    // Active plan check
    if (targetPromo.require_active_plan) {
      const { count: activePlansCount } = await serverAdminSupabase
        .from('user_plans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!activePlansCount || activePlansCount <= 0) {
        return NextResponse.json({
          ok: false,
          error: 'An active investment plan is required to redeem this promo code.',
        }, { status: 400 });
      }
    }

    // 3. Record new claim
    const bonusAmount = Number(targetPromo.reward_amount || 0);
    const newClaim: PromoClaimRecord = {
      id: `claim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      code: targetPromo.code,
      user_id: user.id,
      username: profile.username || 'user',
      amount: bonusAmount,
      claimed_at: new Date().toISOString(),
    };

    claims.unshift(newClaim);
    // Keep max 500 records to prevent json bloat
    if (claims.length > 500) {
      claims = claims.slice(0, 500);
    }

    await serverAdminSupabase
      .from('app_settings')
      .upsert({
        setting_key: 'promo_claims_json',
        setting_value: JSON.stringify(claims),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' });

    // 4. Update user balance
    const currentBalance = Number(profile.balance || 0);
    const currentEarnings = Number(profile.total_earnings || 0);
    const newBalance = currentBalance + bonusAmount;
    const newEarnings = currentEarnings + bonusAmount;

    await serverAdminSupabase
      .from('profiles')
      .update({
        balance: newBalance,
        total_earnings: newEarnings,
      })
      .eq('id', user.id);

    return NextResponse.json({
      ok: true,
      message: `Congratulations! Rs ${bonusAmount.toLocaleString()} credited to your wallet!`,
      amount: bonusAmount,
      code: cleanCode,
      new_balance: newBalance,
    });
  } catch (err: any) {
    console.error('API /api/promo/redeem error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error redeeming promo code.' }, { status: 500 });
  }
}
