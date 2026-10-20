-- ==============================================================================
-- 🚀 TASK EARN HUB: PLANS, BADGES & WALLET RE-INVEST SQL SCRIPT
-- Copy and run this in Supabase SQL Editor (1-Click Run)
-- ==============================================================================

-- 1. Create TRANSACTIONS Table (for logging wallet balance plan purchases and bonuses)
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    type text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own transactions" ON public.transactions;
CREATE POLICY "Users can read own transactions" ON public.transactions 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role all transactions" ON public.transactions;
CREATE POLICY "Service role all transactions" ON public.transactions 
    FOR ALL TO service_role 
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions" ON public.transactions 
    FOR SELECT TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'admin'
      )
    );

-- 2. Enhance PLANS Table (Columns for Marketing Badges & Store Display)
ALTER TABLE public.plans 
    ADD COLUMN IF NOT EXISTS badge_tag text DEFAULT '',
    ADD COLUMN IF NOT EXISTS icon text DEFAULT 'flame',
    ADD COLUMN IF NOT EXISTS theme_key text DEFAULT 'purple',
    ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS total_days integer DEFAULT 30;

-- 3. Enhance USER_PLANS Table (Supports Admin Gift & Wallet Balance purchases)
ALTER TABLE public.user_plans 
    ADD COLUMN IF NOT EXISTS sender_account_name text DEFAULT 'Direct',
    ADD COLUMN IF NOT EXISTS sender_account_number text DEFAULT 'N/A',
    ADD COLUMN IF NOT EXISTS receipt_image_url text DEFAULT '',
    ADD COLUMN IF NOT EXISTS approved_at timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS start_date timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Enable RLS for user_plans
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own user_plans" ON public.user_plans;
CREATE POLICY "Users can read own user_plans" ON public.user_plans 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role all user_plans" ON public.user_plans;
CREATE POLICY "Service role all user_plans" ON public.user_plans 
    FOR ALL TO service_role 
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage all user_plans" ON public.user_plans;
CREATE POLICY "Admins can manage all user_plans" ON public.user_plans 
    FOR ALL TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE public.profiles.id = auth.uid() 
        AND public.profiles.role = 'admin'
      )
    );

-- 4. Ensure DAILY_REWARDS Table & Unique Constraint
CREATE TABLE IF NOT EXISTS public.daily_rewards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_plan_id uuid REFERENCES public.user_plans(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number integer NOT NULL,
    amount numeric NOT NULL,
    is_claimed boolean DEFAULT false,
    status text DEFAULT 'pending',
    claimed_at timestamptz,
    available_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Add Unique Constraint on (user_plan_id, day_number) so rewards upsert cleanly
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'daily_rewards_user_plan_id_day_number_key'
    ) THEN
        ALTER TABLE public.daily_rewards ADD CONSTRAINT daily_rewards_user_plan_id_day_number_key UNIQUE (user_plan_id, day_number);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Enable RLS for daily_rewards
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own daily_rewards" ON public.daily_rewards;
CREATE POLICY "Users can read own daily_rewards" ON public.daily_rewards 
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role all daily_rewards" ON public.daily_rewards;
CREATE POLICY "Service role all daily_rewards" ON public.daily_rewards 
    FOR ALL TO service_role 
    USING (true) WITH CHECK (true);

-- 5. Seed APP_SETTINGS for Rules & Defaults
INSERT INTO public.app_settings (setting_key, setting_value, updated_at) VALUES
    ('allow_balance_reinvest', 'true', now()),
    ('allow_multiple_active_plans', 'true', now()),
    ('referral_bonus', '50', now()),
    ('base_member_plan_price', '250', now()),
    ('free_reward_days', '1', now())
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    updated_at = now();

-- 6. Verification Output
SELECT 'Configuration successful!' as status, 
       (SELECT count(*) FROM public.plans) as total_plans,
       (SELECT count(*) FROM public.app_settings) as total_settings;
