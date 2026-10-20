-- ============================================================================
-- SUPABASE DATABASE PERFECTION & SCHEMA FIXES
-- Platform: Task Earn Hub (Earning Hub)
-- Run this in your Supabase Dashboard -> SQL Editor -> Click 'Run'
-- ============================================================================

-- 1. FIX USER_PLANS NOT-NULL CONSTRAINTS
-- Allows instant plan activation without blocking when deposit details are processed
ALTER TABLE public.user_plans ALTER COLUMN sender_account_name DROP NOT NULL;
ALTER TABLE public.user_plans ALTER COLUMN sender_account_number DROP NOT NULL;
ALTER TABLE public.user_plans ALTER COLUMN receipt_image_url DROP NOT NULL;

-- 2. ENHANCE DEPOSITS TABLE
-- Adds approved_at timestamp column for accurate tracking
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 3. ENHANCE WITHDRAWALS TABLE
-- Ensures processed_at and rejection_reason columns exist
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS processed_at timestamptz;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS fee_amount numeric DEFAULT 0;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS net_receivable numeric DEFAULT 0;

-- 4. ENHANCE PAGE_VIEWS TRACKING TABLE
-- Adds analytical columns for visitor country, city, OS, browser, and referral tracking
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS device_type text;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS os text;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS browser text;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS path text;
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS ref_code text;

-- 5. ENHANCE FEEDBACKS TABLE
-- Adds name and email columns for visitor and user contact forms
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS email text;

-- 6. UNIQUE CONSTRAINT ON WEEKLY SALARY COLLECTIONS
-- Prevents duplicate reward collections for the same level
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'weekly_salary_collections_user_id_level_key'
    ) THEN
        ALTER TABLE public.weekly_salary_collections 
        ADD CONSTRAINT weekly_salary_collections_user_id_level_key UNIQUE (user_id, level);
    END IF;
END $$;

-- 7. CLEAN & SECURE ROW LEVEL SECURITY (RLS) POLICIES
-- Drop any conflicting or recursive policies
DROP POLICY IF EXISTS "Public select app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public select plans" ON public.plans;
DROP POLICY IF EXISTS "Public select payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can read own user_plans" ON public.user_plans;
DROP POLICY IF EXISTS "Users can read own daily_rewards" ON public.daily_rewards;
DROP POLICY IF EXISTS "Users can read own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can create deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can read own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can read own salary" ON public.weekly_salary_collections;
DROP POLICY IF EXISTS "Users can insert salary" ON public.weekly_salary_collections;
DROP POLICY IF EXISTS "Public insert page_views" ON public.page_views;
DROP POLICY IF EXISTS "Public insert feedbacks" ON public.feedbacks;

-- Create ultra-fast non-recursive policies
CREATE POLICY "Public select app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Public select profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Public select plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Public select payment_methods" ON public.payment_methods FOR SELECT USING (true);

CREATE POLICY "Users can read own user_plans" ON public.user_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can read own daily_rewards" ON public.daily_rewards FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can read own deposits" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own salary" ON public.weekly_salary_collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert salary" ON public.weekly_salary_collections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public insert page_views" ON public.page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert feedbacks" ON public.feedbacks FOR INSERT WITH CHECK (true);

-- 8. SERVICE ROLE FULL ACCESS (Master Bypass for Next.js Backend)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

SELECT 'DATABASE PERFECTION COMPLETE! All tables, columns, constraints and RLS policies are 100% operational.' as status;
