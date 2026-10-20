import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_SECRET = process.env.ADMIN_SESSION_SECRET || 'earninghub_super_secret_admin_key_2026_saqib_secure_signature_981273981273';
const BASE_URL = 'http://localhost:3001';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function getAdminToken() {
  const payload = { isAdmin: true, issuedAt: Date.now(), expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
  const str = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', ADMIN_SECRET).update(str).digest('hex');
  return Buffer.from(str + '.' + hmac).toString('base64');
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🚀 TASK EARN HUB: COMPREHENSIVE AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function report(title, isOk, extra = '') {
    if (isOk) {
      console.log(`✅ [PASS] ${title} ${extra}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title} ${extra}`);
      failed++;
    }
  }

  // TEST 1: Branding API Endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/branding`);
    const data = await res.json();
    report('GET /api/branding', res.ok && data.ok, `| Site Name: "${data?.branding?.site_name}", Preset: "${data?.branding?.site_icon_preset}"`);
  } catch (err) {
    report('GET /api/branding', false, err.message);
  }

  // TEST 2: Admin Plan Save with Marketing Badge
  const adminToken = getAdminToken();
  try {
    const res = await fetch(`${BASE_URL}/api/admin/plans/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({
        plan: {
          id: 1,
          plan_number: 1,
          name: 'Starter Plan',
          plan_price: 250,
          daily_reward: 20,
          total_days: 30,
          thirty_day_reward: 600,
          members_required: 3,
          user_total_reward: 750,
          icon: 'flame',
          theme_key: 'purple',
          is_active: true,
          badge_tag: '🔥 HOT'
        },
        metaMap: {
          '1': {
            name: 'Starter Plan',
            icon: 'flame',
            themeKey: 'purple',
            total_days: 30,
            is_active: true,
            badge_tag: '🔥 HOT'
          }
        }
      })
    });
    const data = await res.json();
    report('POST /api/admin/plans/save (with Badge)', res.ok && data.ok, `| Saved Plan: #${data?.plan?.plan_number} (${data?.plan?.name})`);
  } catch (err) {
    report('POST /api/admin/plans/save', false, err.message);
  }

  // TEST 3: Verify app_settings.plans_meta_json in DB
  try {
    const { data, error } = await supabase.from('app_settings').select('setting_value').eq('setting_key', 'plans_meta_json').single();
    const hasBadge = data && data.setting_value && data.setting_value.includes('🔥 HOT');
    report('DB Verify: plans_meta_json Badge Tag', !error && hasBadge, `| Raw value: ${data?.setting_value?.slice(0, 70)}...`);
  } catch (err) {
    report('DB Verify: plans_meta_json', false, err.message);
  }

  // TEST 4: Direct Admin Plan Gift
  let testUserId = null;
  let testUserPlanId = null;
  try {
    const { data: user } = await supabase.from('profiles').select('id, username, email').limit(1).single();
    if (user) {
      testUserId = user.id;
      const res = await fetch(`${BASE_URL}/api/admin/plans/gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
        body: JSON.stringify({
          user_id: user.id,
          plan_id: 1,
          credit_referral: false,
        }),
      });
      const data = await res.json();
      testUserPlanId = data?.user_plan_id;
      report('POST /api/admin/plans/gift (Direct Gift)', res.ok && data.ok, `| User: ${user.username}, Plan: ${data?.plan_name}`);
    } else {
      report('POST /api/admin/plans/gift', false, 'No test user found in profiles');
    }
  } catch (err) {
    report('POST /api/admin/plans/gift', false, err.message);
  }

  // TEST 5: Verify 30 Days Daily Rewards Created with Day 1 Unlocked
  if (testUserPlanId) {
    try {
      const { data: rewards, error } = await supabase
        .from('daily_rewards')
        .select('*')
        .eq('user_plan_id', testUserPlanId)
        .order('day_number', { ascending: true });

      const countOk = rewards && rewards.length === 30;
      const day1Available = rewards && rewards[0] && new Date(rewards[0].available_at) <= new Date(Date.now() + 5000);
      report('DB Verify: 30 Daily Rewards & Day 1 Instant Unlock', !error && countOk && day1Available, `| Total Days: ${rewards?.length}, Day 1 Amount: Rs ${rewards?.[0]?.reward_amount}`);
    } catch (err) {
      report('DB Verify: Daily Rewards', false, err.message);
    }
  }

  // TEST 6: Claim Daily Reward Security Guard
  try {
    const claimRes = await fetch(`${BASE_URL}/api/rewards/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_plan_id: testUserPlanId,
        day_number: 1,
      }),
    });
    const claimData = await claimRes.json();
    report('POST /api/rewards/claim (Auth Security Guard)', claimRes.status === 401 && !claimData.ok, '| Properly blocked 401 without bearer token');
  } catch (err) {
    report('POST /api/rewards/claim', false, err.message);
  }

  // TEST 7: Re-invest Endpoint Auth Protection
  try {
    const unauthRes = await fetch(`${BASE_URL}/api/plans/reinvest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: 1 })
    });
    const unauthData = await unauthRes.json();
    report('POST /api/plans/reinvest (Auth Security Guard)', unauthRes.status === 401 && !unauthData.ok, '| Properly blocked 401 without bearer token');
  } catch (err) {
    report('POST /api/plans/reinvest', false, err.message);
  }

  // TEST 8: Verify App Settings Defaults
  try {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['site_name', 'site_logo_url', 'allow_balance_reinvest', 'referral_bonus']);

    const sMap = {};
    settings?.forEach(s => sMap[s.setting_key] = s.setting_value);
    const hasKeys = sMap['site_name'] && sMap['referral_bonus'];
    report('DB Verify: app_settings Keys', hasKeys, `| site_name: "${sMap['site_name']}", referral_bonus: ${sMap['referral_bonus']}`);
  } catch (err) {
    report('DB Verify: app_settings', false, err.message);
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! The website and backend features are 100% OPERATIONAL!');
  } else {
    console.error(`⚠️ ${failed} test(s) failed. Please check logs above.`);
  }
}

runTestSuite();
