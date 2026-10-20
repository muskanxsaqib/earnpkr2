-- ============================================================================
-- TASK EARN HUB - COMPLETE MASTER BACKEND SQL SETUP
-- Run this in Supabase Dashboard -> SQL Editor (or phpMyAdmin)
-- Connects all website operations to Supabase Backend
-- ============================================================================

-- 1. APP SETTINGS TABLE (Key-Value Store for Branding, Icons, Themes & Rules)
CREATE TABLE IF NOT EXISTS public.app_settings (
    setting_key text PRIMARY KEY,
    setting_value text,
    updated_at timestamptz DEFAULT now()
);

-- Ensure all Branding, Icon, Theme & Economic Settings are seeded
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
    ('site_name', 'Earning Hub'),
    ('site_tagline', 'Powered by Saqib'),
    ('site_description', 'Earn daily, withdraw anytime'),
    ('site_logo_url', 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp'),
    ('site_icon_preset', 'flame'),
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
    ('default_theme_mode', 'astro-neu'),
    ('default_font_mode', 'tech-modern'),
    ('default_rgb_light', 'true'),
    ('allow_user_theme_switcher', 'true'),
    ('whatsapp_link', 'https://chat.whatsapp.com'),
    ('whatsapp_group_link', 'https://chat.whatsapp.com'),
    ('telegram_link', 'https://t.me'),
    ('show_whatsapp', 'true'),
    ('show_telegram', 'true'),
    ('marquee_text', 'Welcome to Earning Hub! Start investing today and earn daily profits. Invite friends to get referral commission!'),
    ('referral_bonus', '50'),
    ('base_member_plan_price', '250'),
    ('min_withdraw_amount', '100'),
    ('min_withdrawal', '100'),
    ('max_withdraw_amount', '50000'),
    ('withdraw_fee_percent', '0'),
    ('withdraw_fee_fixed', '0'),
    ('withdraw_schedule_enabled', 'false'),
    ('withdraw_open_hour', '9'),
    ('withdraw_close_hour', '22'),
    ('withdraw_allowed_days', 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'),
    ('withdrawal_rules_enabled', 'true'),
    ('free_reward_days', '1'),
    ('require_task_before_claim', 'false'),
    ('task_default_timer_seconds', '15'),
    ('promo_feature_enabled', 'true'),
    ('level_1_req', '10'),
    ('level_2_req', '30'),
    ('level_3_req', '50'),
    ('level_4_req', '100'),
    ('level_5_req', '200'),
    ('level_6_req', '500'),
    ('level_1_reward', '500'),
    ('level_2_reward', '1500'),
    ('level_3_reward', '3000'),
    ('level_4_reward', '7000'),
    ('level_5_reward', '15000'),
    ('level_6_reward', '40000'),
    ('invite_share_message', '🚀 Join {site_name}! Earn daily rewards and referral bonuses.\n\nRegister using my link: {link}\nReferral Code: {code}')
ON CONFLICT (setting_key) DO UPDATE 
SET updated_at = now();

-- 2. PLANS TABLE
CREATE TABLE IF NOT EXISTS public.plans (
    id serial PRIMARY KEY,
    plan_number integer UNIQUE,
    name text NOT NULL,
    price numeric NOT NULL,
    daily_reward numeric NOT NULL,
    duration_days integer DEFAULT 30,
    members_required integer DEFAULT 0,
    user_total_reward numeric DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Ensure all required columns exist
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS plan_number integer;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS daily_reward numeric;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 30;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS members_required integer DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS user_total_reward numeric DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Seed Official 10 Plans Matrix
INSERT INTO public.plans (plan_number, name, price, daily_reward, duration_days, members_required, user_total_reward, is_active) VALUES
    (1, 'Starter Plan', 250, 20, 30, 3, 750, true),
    (2, 'Basic Plan', 300, 25, 30, 5, 1000, true),
    (3, 'Silver Plan', 500, 45, 30, 7, 1700, true),
    (4, 'Bronze Plan', 700, 70, 30, 10, 2600, true),
    (5, 'Gold Plan', 1000, 90, 30, 15, 3450, true),
    (6, 'Platinum Plan', 1500, 120, 30, 20, 4600, true),
    (7, 'Diamond Plan', 2000, 150, 30, 25, 5750, true),
    (8, 'VIP Plan', 3000, 210, 30, 30, 7800, true),
    (9, 'Elite Plan', 4000, 260, 30, 35, 9550, true),
    (10, 'Master Plan', 5000, 300, 30, 40, 11000, true)
ON CONFLICT (plan_number) DO UPDATE SET
    name = EXCLUDED.name,
    price = EXCLUDED.price,
    daily_reward = EXCLUDED.daily_reward,
    duration_days = EXCLUDED.duration_days,
    members_required = EXCLUDED.members_required,
    user_total_reward = EXCLUDED.user_total_reward;

-- 3. PAYMENT METHODS TABLE
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id serial PRIMARY KEY,
    method_name text NOT NULL,
    account_number text NOT NULL,
    account_name text,
    account_title text,
    account_holder text,
    is_active boolean DEFAULT true,
    instructions text DEFAULT '',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS account_title text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS account_holder text;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS instructions text DEFAULT '';

-- Seed Default Payment Methods
INSERT INTO public.payment_methods (method_name, account_number, account_name, account_title, account_holder, is_active)
SELECT 'EasyPaisa', '03001234567', 'Saqib Ali', 'Saqib Ali', 'Saqib Ali', true
WHERE NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE method_name = 'EasyPaisa');

INSERT INTO public.payment_methods (method_name, account_number, account_name, account_title, account_holder, is_active)
SELECT 'JazzCash', '03011234567', 'Saqib Ali', 'Saqib Ali', 'Saqib Ali', true
WHERE NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE method_name = 'JazzCash');

-- 4. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text,
    phone text,
    referral_code text UNIQUE,
    referred_by text,
    balance numeric DEFAULT 0,
    role text DEFAULT 'user',
    status text DEFAULT 'active',
    is_banned boolean DEFAULT false,
    ban_reason text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ban_reason text;

-- Make sure Saqib admin account is superadmin
UPDATE public.profiles 
SET role = 'admin', status = 'active', is_banned = false 
WHERE id IN (SELECT id FROM auth.users WHERE email IN ('saqib242saqib@gmail.com', 'admin@gmail.com'));

-- 5. USER PLANS TABLE
CREATE TABLE IF NOT EXISTS public.user_plans (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id integer REFERENCES public.plans(id),
    status text DEFAULT 'active',
    start_date timestamptz DEFAULT now(),
    expires_at timestamptz,
    admin_payment_method_id integer REFERENCES public.payment_methods(id),
    created_at timestamptz DEFAULT now()
);

-- 6. DAILY REWARDS TABLE
CREATE TABLE IF NOT EXISTS public.daily_rewards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_plan_id uuid REFERENCES public.user_plans(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number integer NOT NULL,
    amount numeric NOT NULL,
    is_claimed boolean DEFAULT false,
    claimed_at timestamptz,
    available_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.daily_rewards ADD COLUMN IF NOT EXISTS user_id uuid;

-- 7. DEPOSITS TABLE
CREATE TABLE IF NOT EXISTS public.deposits (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id integer REFERENCES public.plans(id),
    platform_method_id integer REFERENCES public.payment_methods(id),
    amount numeric NOT NULL,
    transaction_id text,
    receipt_url text,
    sender_name text,
    sender_account text,
    sender_method text,
    status text DEFAULT 'pending',
    rejection_reason text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS sender_name text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS sender_account text;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS sender_method text;

-- 8. WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    method text NOT NULL,
    account_name text NOT NULL,
    account_number text NOT NULL,
    amount numeric NOT NULL,
    fee numeric DEFAULT 0,
    net_amount numeric DEFAULT 0,
    status text DEFAULT 'pending',
    rejection_reason text,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS fee numeric DEFAULT 0;
ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS net_amount numeric DEFAULT 0;

-- 9. ADMIN MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.admin_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text DEFAULT 'Platform Notification',
    message text NOT NULL,
    is_broadcast boolean DEFAULT false,
    priority text DEFAULT 'normal',
    type text DEFAULT 'system',
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 10. FEEDBACKS TABLE
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    username text,
    subject text,
    message text NOT NULL,
    rating integer DEFAULT 5,
    created_at timestamptz DEFAULT now()
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info',
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 12. PAGE VIEWS TABLE
CREATE TABLE IF NOT EXISTS public.page_views (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    page text,
    device_id text,
    user_agent text,
    ip_address text,
    created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES & PERMISSIONS
-- Grants full service_role access so Next.js backend APIs never hit RLS errors
-- ============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Enable RLS on core tables
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to prevent duplicate errors
DROP POLICY IF EXISTS "Public select app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Service role all app_settings" ON public.app_settings;
CREATE POLICY "Public select app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Service role all app_settings" ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select plans" ON public.plans;
DROP POLICY IF EXISTS "Service role all plans" ON public.plans;
CREATE POLICY "Public select plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Service role all plans" ON public.plans FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select payment_methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Service role all payment_methods" ON public.payment_methods;
CREATE POLICY "Public select payment_methods" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "Service role all payment_methods" ON public.payment_methods FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public select admin_messages" ON public.admin_messages;
DROP POLICY IF EXISTS "Service role all admin_messages" ON public.admin_messages;
CREATE POLICY "Public select admin_messages" ON public.admin_messages FOR SELECT USING (is_broadcast = true OR auth.uid() = user_id);
CREATE POLICY "Service role all admin_messages" ON public.admin_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role all profiles" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Service role all profiles" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own user_plans" ON public.user_plans;
DROP POLICY IF EXISTS "Service role all user_plans" ON public.user_plans;
CREATE POLICY "Users can read own user_plans" ON public.user_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role all user_plans" ON public.user_plans FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own daily_rewards" ON public.daily_rewards;
DROP POLICY IF EXISTS "Service role all daily_rewards" ON public.daily_rewards;
CREATE POLICY "Users can read own daily_rewards" ON public.daily_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role all daily_rewards" ON public.daily_rewards FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can create deposits" ON public.deposits;
DROP POLICY IF EXISTS "Service role all deposits" ON public.deposits;
CREATE POLICY "Users can read own deposits" ON public.deposits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role all deposits" ON public.deposits FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "Service role all withdrawals" ON public.withdrawals;
CREATE POLICY "Users can read own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role all withdrawals" ON public.withdrawals FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Service role all feedbacks" ON public.feedbacks;
CREATE POLICY "Public insert feedbacks" ON public.feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role all feedbacks" ON public.feedbacks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert page_views" ON public.page_views;
DROP POLICY IF EXISTS "Service role all page_views" ON public.page_views;
CREATE POLICY "Public insert page_views" ON public.page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role all page_views" ON public.page_views FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Done!
SELECT 'All Task Earn Hub database tables, columns, settings, plans, and backend policies successfully created!' as status;
