import { NextResponse } from 'next/server';
import { serverAdminSupabase, getClientIp } from '@/src/lib/serverSupabase';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    // Verify token with Supabase Auth
    const { data: { user }, error: authErr } = await serverAdminSupabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired session' }, { status: 401 });
    }

    // Fetch real profile from DB using service role (bypasses RLS recursion)
    let { data: profile, error: profErr } = await serverAdminSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // If profile does not exist, create it with user's real metadata username
    if (!profile) {
      const cleanUsername = (
        user.user_metadata?.username ||
        user.email?.split('@')[0] ||
        'user'
      ).trim();

      const newProfile = {
        id: user.id,
        email: user.email || '',
        username: cleanUsername,
        phone: user.user_metadata?.phone || '',
        referral_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        referred_by: user.user_metadata?.referred_by || null,
        role: ['saqib242saqib@gmail.com', 'admin@gmail.com'].includes(user.email || '') ? 'admin' : 'user',
        status: 'active',
        balance: 0,
        total_earnings: 0,
        created_at: new Date().toISOString(),
      };

      const { data: created, error: createErr } = await serverAdminSupabase
        .from('profiles')
        .insert(newProfile)
        .select()
        .maybeSingle();

      if (!createErr && created) {
        profile = created;
      } else {
        profile = newProfile;
      }
    }

    // Auto-sync real client IP if missing or changed
    const clientIp = getClientIp(req);
    if (clientIp && clientIp !== '127.0.0.1' && (!profile.last_ip || profile.last_ip !== clientIp)) {
      await serverAdminSupabase.from('profiles').update({ last_ip: clientIp }).eq('id', user.id);
      profile.last_ip = clientIp;
    }

    // Fetch active user plans and approved deposits
    const { data: userPlans } = await serverAdminSupabase
      .from('user_plans')
      .select('id, plan_id, status, plan:plans(id, plan_number)')
      .eq('user_id', user.id)
      .eq('status', 'active');

    let allActivePlans = userPlans || [];

    // Fallback: also include approved deposits if user_plans row is still propagating
    const { data: appDeposits } = await serverAdminSupabase
      .from('deposits')
      .select('id, plan_id, status')
      .eq('user_id', user.id)
      .eq('status', 'approved');

    if (appDeposits && appDeposits.length > 0) {
      const knownPlanIds = new Set(allActivePlans.map((p: any) => String(p.plan_id)));
      for (const dep of appDeposits) {
        if (dep.plan_id && !knownPlanIds.has(String(dep.plan_id))) {
          allActivePlans.push({ id: dep.id, plan_id: dep.plan_id, status: 'active', plan: null });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      profile: {
        ...profile,
        active_plans: allActivePlans,
        active_plan_ids: allActivePlans.map((p: any) => p.plan_id),
      },
      active_plans: allActivePlans,
      active_plan_ids: allActivePlans.map((p: any) => p.plan_id),
    });
  } catch (err: any) {
    console.error('API /api/user/profile error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
