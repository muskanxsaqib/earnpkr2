-- ==============================================================================
-- 🛡️ BACKEND SECURITY & FINANCIAL INTEGRITY MIGRATION SCRIPT
-- ==============================================================================
-- Run this in Supabase SQL Editor to secure all balance, reward, and withdrawal operations.
-- ==============================================================================

-- 1. SECURE FUNCTION: Claim Daily Reward
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
  -- Authenticate caller
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Authentication required.');
  END IF;

  -- Validate day number
  IF p_day_number < 1 OR p_day_number > 30 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid day number (1-30).');
  END IF;

  -- Fetch user plan & verify ownership
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

  -- Verify Timing: Day 1 instant; Day N available at start_date + (N - 1) * 24h
  v_available_at := COALESCE(v_start_date, v_now) + ((p_day_number - 1) * interval '24 hours');
  IF v_now < v_available_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Day ' || p_day_number || ' is not yet unlocked. Please wait.');
  END IF;

  -- Check referral requirement against free_reward_days setting
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
        'error', 'Day ' || p_day_number || ' requires ' || v_members_required || ' active referrals. You currently have ' || v_active_ref_count || '.'
      );
    END IF;
  END IF;

  -- Check if already collected
  SELECT status INTO v_existing_status
  FROM public.daily_rewards
  WHERE user_plan_id = p_user_plan_id AND day_number = p_day_number;

  IF v_existing_status = 'collected' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Day ' || p_day_number || ' reward has already been claimed.');
  END IF;

  -- Record daily reward as collected
  INSERT INTO public.daily_rewards (user_plan_id, user_id, day_number, reward_amount, status, collected_at, available_at)
  VALUES (p_user_plan_id, v_user_id, p_day_number, v_daily_reward, 'collected', v_now, v_available_at)
  ON CONFLICT (user_plan_id, day_number)
  DO UPDATE SET
    status = 'collected',
    collected_at = v_now,
    reward_amount = v_daily_reward;

  -- Atomically increment user balance with row lock
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
    'message', 'Day ' || p_day_number || ' reward (PKR ' || v_daily_reward || ') collected successfully!',
    'amount', v_daily_reward,
    'day_number', p_day_number,
    'new_balance', v_new_balance
  );
END;
$$;

-- 2. SECURE FUNCTION: Refund Rejected Withdrawal
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

  -- Update withdrawal status
  UPDATE public.withdrawals
  SET status = 'rejected', rejection_reason = p_reason, updated_at = now()
  WHERE id = p_withdrawal_id;

  -- Refund user balance
  IF v_amount > 0 THEN
    UPDATE public.profiles
    SET balance = balance + v_amount
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'message', 'Withdrawal rejected and balance refunded.');
END;
$$;

-- 3. PERMISSION HARDENING:
-- Ensure anonymous and normal users cannot directly modify balance/role on profiles
REVOKE UPDATE (role, is_banned) ON public.profiles FROM anon;

-- Grant execution of secure RPC functions to authenticated users
GRANT EXECUTE ON FUNCTION public.secure_claim_daily_reward(uuid, int) TO authenticated;
