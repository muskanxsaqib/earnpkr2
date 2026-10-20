-- =========================================================================
-- TASK EARN HUB: MILITARY-GRADE SUPABASE SECURITY & RLS HARDENING MIGRATION
-- Run this script in your Supabase Project -> SQL Editor
-- =========================================================================

-- 1. BALANCE INTEGRITY CHECK CONSTRAINTS (Zero-Loss Guarantee)
-- Ensure balances and amounts can NEVER be negative at database engine level.
DO $$ 
BEGIN
    -- profiles balance non-negative
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_balance_non_negative'
    ) THEN
        ALTER TABLE public.profiles 
        ADD CONSTRAINT check_balance_non_negative CHECK (balance >= 0);
    END IF;

    -- withdrawals positive amount
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_withdrawal_amount_positive'
    ) THEN
        ALTER TABLE public.withdrawals 
        ADD CONSTRAINT check_withdrawal_amount_positive CHECK (amount > 0);
    END IF;

    -- deposits positive amount
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deposits') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'check_deposit_amount_positive'
        ) THEN
            ALTER TABLE public.deposits 
            ADD CONSTRAINT check_deposit_amount_positive CHECK (amount > 0);
        END IF;
    END IF;
END $$;

-- 2. ATOMIC ROW-LOCKING BALANCE DEDUCTION (Anti-Race Condition & Anti-Double-Spend)
CREATE OR REPLACE FUNCTION public.atomic_deduct_balance(
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Deduction amount must be strictly positive';
    END IF;

    -- Explicit Row-Level Lock (FOR UPDATE) blocks concurrent race requests
    SELECT balance INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance: available %, requested %', v_current_balance, p_amount;
    END IF;

    v_new_balance := v_current_balance - p_amount;

    UPDATE public.profiles
    SET balance = v_new_balance
    WHERE id = p_user_id;

    RETURN v_new_balance;
END;
$$;

-- 3. ATOMIC BALANCE CREDIT (Safe Ledger Addition)
CREATE OR REPLACE FUNCTION public.atomic_credit_balance(
    p_user_id UUID,
    p_amount NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance NUMERIC;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Credit amount must be strictly positive';
    END IF;

    UPDATE public.profiles
    SET balance = balance + p_amount
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;

    RETURN v_new_balance;
END;
$$;

-- 4. ULTRA-FAST QUERY INDEXES (Anti-DDoS & Quick Lookups)
CREATE INDEX IF NOT EXISTS idx_profiles_last_ip ON public.profiles(last_ip);
CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON public.profiles(device_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status ON public.withdrawals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_daily_rewards_claim ON public.daily_rewards(user_id, status, available_at);
CREATE INDEX IF NOT EXISTS idx_user_plans_user_status ON public.user_plans(user_id, status);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES HARDENING

-- (A) PROFILES TABLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;
CREATE POLICY "Service role has full access to profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- (B) USER_PLANS TABLE
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own plans" ON public.user_plans;
CREATE POLICY "Users can read own plans"
ON public.user_plans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access to user_plans" ON public.user_plans;
CREATE POLICY "Service role has full access to user_plans"
ON public.user_plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- (C) DAILY_REWARDS TABLE
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own daily rewards" ON public.daily_rewards;
CREATE POLICY "Users can read own daily rewards"
ON public.daily_rewards
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access to daily_rewards" ON public.daily_rewards;
CREATE POLICY "Service role has full access to daily_rewards"
ON public.daily_rewards
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- (D) WITHDRAWALS TABLE
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can view own withdrawals"
ON public.withdrawals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own withdrawal" ON public.withdrawals;
CREATE POLICY "Users can create own withdrawal"
ON public.withdrawals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role has full access to withdrawals" ON public.withdrawals;
CREATE POLICY "Service role has full access to withdrawals"
ON public.withdrawals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- (E) APP_SETTINGS TABLE
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view application settings" ON public.app_settings;
CREATE POLICY "Public can view application settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Service role has full access to app_settings" ON public.app_settings;
CREATE POLICY "Service role has full access to app_settings"
ON public.app_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Confirm Completion
SELECT 'Military-grade security hardening & atomic locks successfully applied.' AS result;
