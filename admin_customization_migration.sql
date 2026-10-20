-- ============================================================================
-- TASK EARN HUB: FULL ADMIN CUSTOMIZATION, BRANDING & ECONOMIC ENGINE MIGRATION
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- 1. Add Extended Customization Columns to `public.plans` (Safe & Idempotent)
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS total_days INTEGER DEFAULT 30;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'flame';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS theme_key TEXT DEFAULT 'purple';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS thirty_day_reward NUMERIC DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS user_total_reward NUMERIC DEFAULT 0;

-- Backfill default names and 30-day / total rewards for existing plans 1-10 if null
UPDATE public.plans
SET
  name = COALESCE(NULLIF(name, ''), 'Plan ' || plan_number),
  total_days = COALESCE(total_days, 30),
  thirty_day_reward = COALESCE(NULLIF(thirty_day_reward, 0), daily_reward * COALESCE(total_days, 30)),
  user_total_reward = COALESCE(NULLIF(user_total_reward, 0), (daily_reward * COALESCE(total_days, 30)) + (members_required * 50)),
  is_active = COALESCE(is_active, true)
WHERE name IS NULL OR thirty_day_reward IS NULL OR thirty_day_reward = 0;

-- 2. Ensure `public.app_settings` and `public.feature_flags` Tables Exist
CREATE TABLE IF NOT EXISTS public.app_settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  feature_name TEXT PRIMARY KEY,
  is_enabled BOOLEAN DEFAULT false NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default feature flags (All default to false / OFF)
INSERT INTO public.feature_flags (feature_name, is_enabled, description)
VALUES
  ('promo_codes', false, 'Promo and Gift Code Redeem System'),
  ('daily_task_verification', false, 'Require watching link or timer before daily reward claim'),
  ('custom_withdrawal_rules', false, 'Full Admin control for withdrawal fees, max limits, and schedule hours')
ON CONFLICT (feature_name) DO UPDATE
SET description = EXCLUDED.description;

-- 3. Seed All Branding, Invite, Withdrawal & Team Salary Keys (Preserves Existing Values)
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES
  -- Website Branding & Icon Defaults
  ('site_name', 'Earning Hub'),
  ('site_tagline', 'Powered by Saqib'),
  ('site_description', 'Earn daily, withdraw anytime'),
  ('site_logo_url', 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp'),
  ('site_icon_preset', 'custom_image'),
  -- Pre-Login Public Landing Page & Showcase Controls
  ('show_landing_page', 'true'),
  ('landing_badge', 'PAKISTAN''S #1 DAILY REWARD PLATFORM'),
  ('landing_title', 'Earn Daily Fixed Rewards & Instant Referral Bonuses'),
  ('landing_about', 'Welcome to our official earning platform! Activate any reward package to collect fixed daily income for 30 days (Day 1 unlocked immediately), invite team members for flat referral bonuses & weekly team salaries, and withdraw your earnings anytime via EasyPaisa or JazzCash.'),
  ('landing_hero_image', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&q=80'),
  ('landing_show_hero_image', 'true'),
  ('landing_show_live_ticker', 'true'),
  ('landing_show_about', 'true'),
  ('landing_show_steps', 'true'),
  ('landing_show_plans', 'true'),
  ('landing_show_calculator', 'true'),
  ('landing_show_stats', 'true'),
  ('landing_show_faq', 'true'),
  ('landing_step1_title', 'Create Free Account & Choose a Plan'),
  ('landing_step1_desc', 'Register in 30 seconds and activate any plan starting from Rs. 250 using EasyPaisa or JazzCash.'),
  ('landing_step2_title', 'Collect Daily Fixed Rewards (Day 1 Instant)'),
  ('landing_step2_desc', 'Your Day 1 reward unlocks immediately upon activation! Collect fixed daily income for 30 days.'),
  ('landing_step3_title', 'Invite Friends & Withdraw Anytime'),
  ('landing_step3_desc', 'Earn flat referral bonus on every active member plus 6-Level Team Salary. Withdraw to EasyPaisa or JazzCash.'),
  ('landing_login_btn_text', 'Login'),
  ('landing_register_btn_text', 'Register Now'),
  -- Global Multi-Theme, Dynamic Font & Ambient RGB Defaults
  ('default_theme_mode', 'astro-neu'),
  ('default_font_mode', 'tech-modern'),
  ('default_rgb_light', 'true'),
  ('allow_user_theme_switcher', 'true'),
  -- Economic & Referral Rules
  ('referral_bonus', '50'),
  ('base_member_plan_price', '250'),
  ('free_reward_days', '1'),
  ('min_withdraw_amount', '100'),
  ('min_withdrawal', '100'),
  ('invite_share_message', ''),
  ('invite_share_template', ''),
  ('plans_meta_json', '{}'),
  -- Team Salary Required Active Members (Levels 1 to 6)
  ('level_1_req', '10'),
  ('level_2_req', '30'),
  ('level_3_req', '60'),
  ('level_4_req', '100'),
  ('level_5_req', '130'),
  ('level_6_req', '175'),
  -- Team Salary Custom Reward Amounts (0 = Auto-calculate from Referral Bonus)
  ('level_1_reward', '0'),
  ('level_2_reward', '0'),
  ('level_3_reward', '0'),
  ('level_4_reward', '0'),
  ('level_5_reward', '0'),
  ('level_6_reward', '0'),
  -- Promo & Gift Code Redeem Engine (OFF by default)
  ('promo_feature_enabled', 'false'),
  ('promo_codes_json', '[]'),
  ('promo_claims_json', '[]'),
  -- Daily Reward Task & Countdown Timer Verification Engine (OFF by default)
  ('require_task_before_claim', 'false'),
  ('task_default_timer_seconds', '15'),
  ('daily_tasks_json', '[]'),
  -- Withdrawal Fee, Limits & Open Hours Schedule Controls (OFF by default)
  ('withdrawal_rules_enabled', 'false'),
  ('withdraw_fee_percent', '0'),
  ('withdraw_fee_fixed', '0'),
  ('max_withdraw_amount', '50000'),
  ('withdraw_schedule_enabled', 'false'),
  ('withdraw_open_hour', '9'),
  ('withdraw_close_hour', '21'),
  ('withdraw_allowed_days', '1,2,3,4,5,6'),
  ('withdraw_closed_message', 'Withdrawals sirf muqarara waqt (Open Hours) mein open hoti hain. Meharbani karke open timing mein request bhejein.')
ON CONFLICT (setting_key) DO NOTHING;

-- Ensure the 3 new optional features start OFF ('false') unless Admin turns them ON
UPDATE public.app_settings
SET setting_value = 'false', updated_at = NOW()
WHERE setting_key IN ('promo_feature_enabled', 'require_task_before_claim', 'withdrawal_rules_enabled')
  AND setting_value NOT IN ('true', 'false');

-- 4. Ensure RLS Policies on all public tables allow smooth access without type mismatch
DO $$ 
DECLARE
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Enable all access" ON public.' || quote_ident(t);
    EXECUTE 'CREATE POLICY "Enable all access" ON public.' || quote_ident(t) || ' FOR ALL USING (true) WITH CHECK (true)';
  END LOOP;
END $$;

-- 5. Drop old `request_withdrawal` function first to avoid 42P13 return-type conflict, then recreate with safe ::text comparisons
DROP FUNCTION IF EXISTS public.request_withdrawal(numeric, text, text, text);

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_method TEXT,
  p_account_number TEXT,
  p_account_name TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
  v_pending_count INT;
  v_min_withdraw NUMERIC := 100;
  v_max_withdraw NUMERIC := 50000;
  v_min_setting TEXT;
  v_max_setting TEXT;
  v_withdrawal_id TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Read dynamic minimum withdrawal limit from app_settings
  SELECT setting_value INTO v_min_setting
  FROM public.app_settings
  WHERE setting_key IN ('min_withdraw_amount', 'min_withdrawal')
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_min_setting IS NOT NULL AND v_min_setting ~ '^[0-9]+(\.[0-9]+)?$' THEN
    v_min_withdraw := v_min_setting::NUMERIC;
  END IF;

  -- Read dynamic maximum withdrawal limit from app_settings
  SELECT setting_value INTO v_max_setting
  FROM public.app_settings
  WHERE setting_key = 'max_withdraw_amount'
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_max_setting IS NOT NULL AND v_max_setting ~ '^[0-9]+(\.[0-9]+)?$' AND v_max_setting::NUMERIC > 0 THEN
    v_max_withdraw := v_max_setting::NUMERIC;
  END IF;

  IF p_amount < v_min_withdraw THEN
    RAISE EXCEPTION 'Minimum withdrawal request amount % PKR hai.', v_min_withdraw;
  END IF;

  IF p_amount > v_max_withdraw THEN
    RAISE EXCEPTION 'Maximum withdrawal request amount % PKR hai.', v_max_withdraw;
  END IF;

  -- Check if user already has a pending withdrawal (using ::text to avoid text = uuid error)
  SELECT COUNT(*) INTO v_pending_count
  FROM public.withdrawals
  WHERE user_id::text = v_user_id::text AND status = 'pending';

  IF v_pending_count > 0 THEN
    RAISE EXCEPTION 'You already have a pending withdrawal request.';
  END IF;

  -- Lock profile row and verify balance (using ::text to avoid text = uuid error)
  SELECT balance INTO v_balance
  FROM public.profiles
  WHERE id::text = v_user_id::text
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance.';
  END IF;

  -- Deduct balance
  UPDATE public.profiles
  SET balance = balance - p_amount
  WHERE id::text = v_user_id::text;

  -- Insert withdrawal record
  INSERT INTO public.withdrawals (user_id, amount, method, account_number, account_name, status)
  VALUES (v_user_id, p_amount, p_method, p_account_number, p_account_name, 'pending')
  RETURNING id::TEXT INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$$;

-- 6. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';

