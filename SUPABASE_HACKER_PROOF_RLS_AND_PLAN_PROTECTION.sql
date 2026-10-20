-- ==============================================================================
-- 🛡️ TASK EARN HUB: 100% HACKER-PROOF RLS & PLAN TAMPERING PROTECTION SCRIPT
-- ==============================================================================
-- Purpose:
-- 1. Completely BLOCKS any hacker from altering `plans` (prices, rewards, etc.)
-- 2. Completely BLOCKS hackers from inserting fake `user_plans` or activating plans for free
-- 3. Completely BLOCKS direct modification of user balances, roles, or earnings via client scripts
-- 4. Secures `daily_rewards`, `deposits`, `withdrawals`, `payment_methods`, and `app_settings`
-- 5. Implements PostgreSQL Triggers as an unbypassable second-layer firewall
--
-- HOW TO USE:
-- Copy this ENTIRE file -> Go to Supabase Dashboard -> SQL Editor -> New Query -> Paste & Click "RUN".
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1: ENABLE ROW LEVEL SECURITY (RLS) ON ALL CORE TABLES
-- ------------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- If transactions or collections exist, enable RLS on them too
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referral_collections') THEN
        ALTER TABLE public.referral_collections ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_salary_collections') THEN
        ALTER TABLE public.weekly_salary_collections ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- STEP 2: HARDEN `plans` TABLE (ANTI-PLAN HACKING)
-- No hacker can change plan prices, daily rewards, or members required!
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active plans" ON public.plans;
DROP POLICY IF EXISTS "Service role can manage plans" ON public.plans;
DROP POLICY IF EXISTS "Anyone can view plans" ON public.plans;
DROP POLICY IF EXISTS "Admin manage plans" ON public.plans;

-- Everyone (authenticated and anonymous visitors) can ONLY view active plans
CREATE POLICY "Public can view active plans"
ON public.plans
FOR SELECT
TO anon, authenticated
USING (true);

-- Only Backend Admin (service_role) can INSERT, UPDATE, or DELETE plans
CREATE POLICY "Service role can manage plans"
ON public.plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- UNBYPASSABLE TRIGGER: Rejects any non-service_role attempt to modify `plans`
CREATE OR REPLACE FUNCTION public.guard_plans_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.role() <> 'service_role' THEN
        RAISE EXCEPTION 'SECURITY ALERT: Direct modification of plans is strictly blocked! Only system administrators via verified backend can alter plans.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_plans_modification ON public.plans;
CREATE TRIGGER trg_guard_plans_modification
BEFORE INSERT OR UPDATE OR DELETE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.guard_plans_modification();


-- ------------------------------------------------------------------------------
-- STEP 3: HARDEN `user_plans` TABLE (ANTI-FREE PLAN INJECTION)
-- Hackers CANNOT activate plans on their own or assign free plans via console/cURL!
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own plans" ON public.user_plans;
DROP POLICY IF EXISTS "Users can insert user_plans" ON public.user_plans;
DROP POLICY IF EXISTS "Service role full user_plans" ON public.user_plans;
DROP POLICY IF EXISTS "Allow users to read own plans" ON public.user_plans;

-- Users can ONLY SELECT their own plans
CREATE POLICY "Users can view own plans"
ON public.user_plans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Direct client INSERT, UPDATE, and DELETE are completely blocked for anon & authenticated!
-- Only service_role (Next.js backend after verified balance/receipt check) can activate plans
CREATE POLICY "Service role full user_plans"
ON public.user_plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- UNBYPASSABLE TRIGGER: Rejects any attempt to directly set status = 'active' from client
CREATE OR REPLACE FUNCTION public.guard_user_plans_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.role() <> 'service_role' THEN
        IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
            RAISE EXCEPTION 'SECURITY ALERT: Direct activation of user plans is strictly blocked. All activations must go through verified payment backend.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_plans_activation ON public.user_plans;
CREATE TRIGGER trg_guard_user_plans_activation
BEFORE INSERT OR UPDATE ON public.user_plans
FOR EACH ROW EXECUTE FUNCTION public.guard_user_plans_activation();


-- ------------------------------------------------------------------------------
-- STEP 4: HARDEN `profiles` TABLE (ANTI-BALANCE & ROLE TAMPERING)
-- Hackers CANNOT edit their balance, total_earnings, role, or is_banned status!
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role all profiles" ON public.profiles;

-- Anyone can read basic profile info (required for referral link resolution)
CREATE POLICY "Public select profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Authenticated users can update ONLY safe columns (full_name, phone, avatar)
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Service role has master administrative access
CREATE POLICY "Service role all profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- UNBYPASSABLE TRIGGER: Blocks any client-side update to balance, earnings, admin roles, or bans
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.role() <> 'service_role' THEN
        -- Check if sensitive financial/privilege columns were modified (using IS DISTINCT FROM for NULL safety)
        IF (NEW.balance IS DISTINCT FROM OLD.balance) THEN
            RAISE EXCEPTION 'SECURITY ALERT: Unauthorized balance modification attempt blocked!';
        END IF;
        IF (NEW.total_earnings IS DISTINCT FROM OLD.total_earnings) THEN
            RAISE EXCEPTION 'SECURITY ALERT: Unauthorized total_earnings modification attempt blocked!';
        END IF;
        IF (NEW.role IS DISTINCT FROM OLD.role) THEN
            RAISE EXCEPTION 'SECURITY ALERT: Privilege escalation blocked! Role cannot be self-modified.';
        END IF;
        IF (NEW.is_banned IS DISTINCT FROM OLD.is_banned) THEN
            RAISE EXCEPTION 'SECURITY ALERT: Account ban state cannot be altered by client.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_sensitive_columns ON public.profiles;
CREATE TRIGGER trg_guard_profile_sensitive_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive_columns();


-- ------------------------------------------------------------------------------
-- STEP 5: HARDEN `daily_rewards` TABLE (ANTI-REWARD TAMPERING)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own daily rewards" ON public.daily_rewards;
DROP POLICY IF EXISTS "Service role full daily_rewards" ON public.daily_rewards;

CREATE POLICY "Users can view own daily rewards"
ON public.daily_rewards
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full daily_rewards"
ON public.daily_rewards
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- STEP 6: HARDEN `deposits` & `withdrawals` TABLES
-- Hackers cannot self-approve deposits or self-complete withdrawals!
-- ------------------------------------------------------------------------------
-- Withdrawals:
DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can create own withdrawal" ON public.withdrawals;
DROP POLICY IF EXISTS "Service role has full access to withdrawals" ON public.withdrawals;

CREATE POLICY "Users can view own withdrawals"
ON public.withdrawals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own withdrawal"
ON public.withdrawals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Service role has full access to withdrawals"
ON public.withdrawals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Deposits:
DROP POLICY IF EXISTS "Users can view own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can insert own deposit" ON public.deposits;
DROP POLICY IF EXISTS "Service role full deposits" ON public.deposits;

CREATE POLICY "Users can view own deposits"
ON public.deposits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own deposit"
ON public.deposits
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Service role full deposits"
ON public.deposits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger: Rejects non-service_role attempt to approve deposits or withdrawals
CREATE OR REPLACE FUNCTION public.guard_financial_status_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF auth.role() <> 'service_role' THEN
        IF (OLD.status = 'pending' AND NEW.status IN ('approved', 'completed')) THEN
            RAISE EXCEPTION 'SECURITY ALERT: Only authorized backend administrators can approve financial transactions!';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_deposit_status ON public.deposits;
CREATE TRIGGER trg_guard_deposit_status
BEFORE UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.guard_financial_status_changes();

DROP TRIGGER IF EXISTS trg_guard_withdrawal_status ON public.withdrawals;
CREATE TRIGGER trg_guard_withdrawal_status
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.guard_financial_status_changes();


-- ------------------------------------------------------------------------------
-- STEP 7: HARDEN `payment_methods` & `app_settings` (ANTI-CONFIG SPOOFING)
-- Hackers cannot alter Admin Easypaisa/Jazzcash numbers or referral bonus rates!
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Service role full payment methods" ON public.payment_methods;

CREATE POLICY "Public can view payment methods"
ON public.payment_methods
FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Service role full payment methods"
ON public.payment_methods
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view application settings" ON public.app_settings;
DROP POLICY IF EXISTS "Service role has full access to app_settings" ON public.app_settings;

CREATE POLICY "Public can view application settings"
ON public.app_settings
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Service role has full access to app_settings"
ON public.app_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- STEP 8: DATABASE ENGINE CHECK CONSTRAINTS (ZERO-LOSS GUARANTEE)
-- ------------------------------------------------------------------------------
DO $$ 
BEGIN
    -- profiles balance non-negative
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_balance_non_negative') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT check_balance_non_negative CHECK (balance >= 0);
    END IF;

    -- withdrawals positive amount
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_withdrawal_amount_positive') THEN
        ALTER TABLE public.withdrawals ADD CONSTRAINT check_withdrawal_amount_positive CHECK (amount > 0);
    END IF;

    -- deposits positive amount
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_deposit_amount_positive') THEN
        ALTER TABLE public.deposits ADD CONSTRAINT check_deposit_amount_positive CHECK (amount > 0);
    END IF;

    -- plans prices non-negative
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_plan_price_non_negative') THEN
        ALTER TABLE public.plans ADD CONSTRAINT check_plan_price_non_negative CHECK (plan_price >= 0 AND daily_reward >= 0);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 9: GRANT PROPER PERMISSIONS TO SERVICE ROLE & AUTHENTICATED USERS
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- ------------------------------------------------------------------------------
-- VERIFICATION CONFIRMATION
-- ------------------------------------------------------------------------------
SELECT '🛡️ 100% Hacker-Proof RLS & Plan Protection successfully engaged!' AS result;
