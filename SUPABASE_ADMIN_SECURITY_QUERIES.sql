-- ==============================================================================
-- 🚀 SUPABASE MASTER ADMIN SECURITY & SERVICE ROLE RLS LOCKDOWN (FIXED)
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard/project/mmvchbnfhnnhcrtjsmjc
-- 2. Click "SQL Editor" on the left menu -> Click "New query".
-- 3. Paste this ENTIRE script and click "Run" (Ctrl + Enter).
-- ==============================================================================

-- 1. Ensure required extensions & missing columns exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add missing columns safely so no 'column does not exist' error occurs
ALTER TABLE IF EXISTS public.daily_rewards ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE IF EXISTS public.daily_rewards ADD COLUMN IF NOT EXISTS collected_at timestamp with time zone;
ALTER TABLE IF EXISTS public.daily_rewards ADD COLUMN IF NOT EXISTS available_at timestamp with time zone;
ALTER TABLE IF EXISTS public.user_plans ADD COLUMN IF NOT EXISTS start_date timestamp with time zone DEFAULT timezone('utc'::text, now());
ALTER TABLE IF EXISTS public.deposits ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE IF EXISTS public.withdrawals ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE IF EXISTS public.withdrawals ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;

-- Backfill user_id on daily_rewards from user_plans if any exist
DO $$
BEGIN
  UPDATE public.daily_rewards dr
  SET user_id = up.user_id
  FROM public.user_plans up
  WHERE dr.user_plan_id = up.id AND dr.user_id IS NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Drop existing loose policies
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'profiles', 'plans', 'user_plans', 'daily_rewards',
    'deposits', 'withdrawals', 'payment_methods', 'app_settings', 'notifications'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE 'ALTER TABLE IF EXISTS public.' || quote_ident(t) || ' ENABLE ROW LEVEL SECURITY;';
    EXECUTE 'DROP POLICY IF EXISTS "Enable all access" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own profile" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Users can update own profile" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Profiles view policy" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Profiles insert policy" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Profiles self update non-sensitive" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "User plans view policy" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Daily rewards view policy" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Deposits view policy" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Deposits submit policy" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Withdrawals view policy" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "App settings are readable by everyone" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Payment methods readable by everyone" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Notifications view policy" ON public.' || quote_ident(t) || ';';
    EXECUTE 'DROP POLICY IF EXISTS "Notifications update policy" ON public.' || quote_ident(t) || ';';
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. PROFILES TABLE SECURITY
-- ------------------------------------------------------------------------------
CREATE POLICY "Profiles view policy"
ON public.profiles FOR SELECT
USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Profiles insert policy"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Normal users CANNOT update balance, role, or ban status directly
CREATE POLICY "Profiles self update non-sensitive"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  balance = (SELECT p.balance FROM public.profiles p WHERE p.id = auth.uid()) AND
  role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) AND
  is_banned = (SELECT p.is_banned FROM public.profiles p WHERE p.id = auth.uid())
);

-- ------------------------------------------------------------------------------
-- 4. PLANS TABLE SECURITY (Public Read, Backend Write)
-- ------------------------------------------------------------------------------
CREATE POLICY "Plans are viewable by everyone"
ON public.plans FOR SELECT
USING (true);

-- ------------------------------------------------------------------------------
-- 5. USER_PLANS TABLE SECURITY (User Own Read, Backend Activation)
-- ------------------------------------------------------------------------------
CREATE POLICY "User plans view policy"
ON public.user_plans FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ------------------------------------------------------------------------------
-- 6. DAILY_REWARDS TABLE SECURITY (Robust Join on user_plans & direct user_id)
-- ------------------------------------------------------------------------------
CREATE POLICY "Daily rewards view policy"
ON public.daily_rewards FOR SELECT
USING (
  (user_id IS NOT NULL AND auth.uid() = user_id) OR
  EXISTS (
    SELECT 1 FROM public.user_plans up
    WHERE up.id = public.daily_rewards.user_plan_id AND up.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
);

-- ------------------------------------------------------------------------------
-- 7. DEPOSITS TABLE SECURITY (User Submit Pending, Admin Process)
-- ------------------------------------------------------------------------------
CREATE POLICY "Deposits view policy"
ON public.deposits FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Deposits submit policy"
ON public.deposits FOR INSERT
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- ------------------------------------------------------------------------------
-- 8. WITHDRAWALS TABLE SECURITY (User Own Read, Backend Process)
-- ------------------------------------------------------------------------------
CREATE POLICY "Withdrawals view policy"
ON public.withdrawals FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ------------------------------------------------------------------------------
-- 9. APP_SETTINGS & PAYMENT_METHODS (Public Read, Backend Write)
-- ------------------------------------------------------------------------------
CREATE POLICY "App settings are readable by everyone"
ON public.app_settings FOR SELECT
USING (true);

CREATE POLICY "Payment methods readable by everyone"
ON public.payment_methods FOR SELECT
USING (true);

CREATE POLICY "Notifications view policy"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Notifications update policy"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 10. ATOMIC SECURE FUNCTIONS (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- Claim Daily Reward Function (Row Lock & Anti-Cheat)
CREATE OR REPLACE FUNCTION public.secure_claim_daily_reward(
  p_user_plan_id uuid,
  p_day_number int
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_plan_id bigint;
  v_plan_status text;
  v_start_date timestamp with time zone;
  v_daily_reward numeric;
  v_members_required int;
  v_free_days int := 1;
  v_free_setting text;
  v_now timestamp with time zone := now();
  v_available_at timestamp with time zone;
  v_active_ref_count int := 0;
  v_referral_code text;
  v_existing_status text;
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required.');
  END IF;

  IF p_day_number < 1 OR p_day_number > 30 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid day number (1-30).');
  END IF;

  SELECT up.plan_id, up.status, up.start_date, p.daily_reward, p.members_required
  INTO v_plan_id, v_plan_status, v_start_date, v_daily_reward, v_members_required
  FROM public.user_plans up
  JOIN public.plans p ON p.id = up.plan_id
  WHERE up.id = p_user_plan_id AND up.user_id = v_user_id;

  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Active plan not found.');
  END IF;

  IF v_plan_status != 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This plan is not currently active.');
  END IF;

  v_available_at := COALESCE(v_start_date, v_now) + ((p_day_number - 1) * interval '24 hours');
  IF v_now < v_available_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Day ' || p_day_number || ' is not yet unlocked.');
  END IF;

  SELECT setting_value INTO v_free_setting
  FROM public.app_settings
  WHERE setting_key = 'free_reward_days'
  LIMIT 1;

  IF v_free_setting ~ '^[0-9]+$' THEN
    v_free_days := v_free_setting::int;
  END IF;

  IF p_day_number > v_free_days AND v_members_required > 0 THEN
    SELECT referral_code INTO v_referral_code FROM public.profiles WHERE id = v_user_id;

    SELECT COUNT(DISTINCT prof.id) INTO v_active_ref_count
    FROM public.profiles prof
    JOIN public.user_plans up ON up.user_id = prof.id AND up.status = 'active'
    WHERE prof.referred_by = v_referral_code;

    IF v_active_ref_count < v_members_required THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Day ' || p_day_number || ' requires ' || v_members_required || ' active referrals.'
      );
    END IF;
  END IF;

  SELECT status INTO v_existing_status
  FROM public.daily_rewards
  WHERE user_plan_id = p_user_plan_id AND day_number = p_day_number;

  IF v_existing_status = 'collected' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Day ' || p_day_number || ' reward has already been claimed.');
  END IF;

  INSERT INTO public.daily_rewards (user_plan_id, user_id, day_number, reward_amount, status, collected_at, available_at)
  VALUES (p_user_plan_id, v_user_id, p_day_number, v_daily_reward, 'collected', v_now, v_available_at)
  ON CONFLICT (user_plan_id, day_number)
  DO UPDATE SET
    status = 'collected',
    collected_at = v_now,
    reward_amount = v_daily_reward,
    user_id = v_user_id;

  SELECT balance INTO v_current_balance
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  v_new_balance := COALESCE(v_current_balance, 0) + v_daily_reward;

  UPDATE public.profiles
  SET
    balance = v_new_balance,
    total_earnings = COALESCE(total_earnings, 0) + v_daily_reward
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Reward collected successfully!',
    'amount', v_daily_reward,
    'day_number', p_day_number,
    'new_balance', v_new_balance
  );
END;
$$;

-- Secure Refund on Withdrawal Rejection Function
CREATE OR REPLACE FUNCTION public.secure_reject_withdrawal(
  p_withdrawal_id uuid,
  p_reason text DEFAULT 'Rejected by admin'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_amount numeric;
  v_status text;
BEGIN
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
  FROM public.withdrawals
  WHERE id = p_withdrawal_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Withdrawal record not found.');
  END IF;

  IF v_status != 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Withdrawal is not in pending state.');
  END IF;

  UPDATE public.withdrawals
  SET status = 'rejected', rejection_reason = p_reason, updated_at = now()
  WHERE id = p_withdrawal_id;

  IF v_amount > 0 THEN
    UPDATE public.profiles
    SET balance = balance + v_amount
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'message', 'Withdrawal rejected and balance refunded.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.secure_claim_daily_reward(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_reject_withdrawal(uuid, text) TO authenticated;

SELECT '✅ Security Policies & Functions successfully applied!' as status;
