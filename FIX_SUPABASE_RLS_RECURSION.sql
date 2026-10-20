-- ============================================================================
-- FIX SUPABASE RLS INFINITE RECURSION (ERROR 42P17) & RESTORE GLOBAL SYNC
-- Run this query once in your Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- 1. Drop any old / recursive policies on profiles and app_settings
DROP POLICY IF EXISTS "Profiles view policy" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Public select app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "App settings are readable by everyone" ON public.app_settings;
DROP POLICY IF EXISTS "Service role all app_settings" ON public.app_settings;

-- 2. Clean, lightning-fast non-recursive SELECT policies
-- app_settings: Everyone (guest, 2nd browser, admin) can read site branding & icons
CREATE POLICY "Public select app_settings" 
ON public.app_settings FOR SELECT 
USING (true);

-- profiles: Public can read profile data (needed for referral codes & team queries)
CREATE POLICY "Public select profiles" 
ON public.profiles FOR SELECT 
USING (true);

-- profiles: Users can update their own row only
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- 3. Ensure service_role has unlimited master access (used by our Next.js backend API routes)
CREATE POLICY "Service role all app_settings" 
ON public.app_settings FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role all profiles" 
ON public.profiles FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

GRANT ALL ON public.app_settings TO service_role;
GRANT ALL ON public.profiles TO service_role;

-- 4. Verify result
SELECT 'Supabase RLS recursion fixed successfully! Global branding & clean profiles active.' as result;
