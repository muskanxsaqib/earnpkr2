-- ==============================================================================
-- 🚀 SUPABASE MIGRATION: FEATURE FLAGS TABLE WITH RLS (ROLE-BASED ACCESS)
-- Run this query in Supabase -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Create the `feature_flags` table
CREATE TABLE IF NOT EXISTS public.feature_flags (
  feature_name text PRIMARY KEY,
  is_enabled boolean DEFAULT false NOT NULL,
  description text DEFAULT '',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure all columns exist (Idempotent for safe re-runs)
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
ALTER TABLE public.feature_flags ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;

-- 2. Seed default feature flags (All OFF by default: false)
INSERT INTO public.feature_flags (feature_name, is_enabled, description)
VALUES
  ('promo_codes', false, 'Promo and Gift Code Redeem System'),
  ('daily_task_verification', false, 'Require watching link or countdown timer before claiming daily reward'),
  ('custom_withdrawal_rules', false, 'Full Admin control for withdrawal fees, max limits, and schedule hours')
ON CONFLICT (feature_name) DO UPDATE
SET description = EXCLUDED.description;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Clean existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.feature_flags;
DROP POLICY IF EXISTS "Allow read access for all" ON public.feature_flags;
DROP POLICY IF EXISTS "Allow update access only for admins" ON public.feature_flags;
DROP POLICY IF EXISTS "Allow insert access only for admins" ON public.feature_flags;
DROP POLICY IF EXISTS "Allow delete access only for admins" ON public.feature_flags;

-- Policy 1: Read access for all authenticated users (also allows anon so pre-auth views load cleanly)
CREATE POLICY "Allow read access for authenticated users"
ON public.feature_flags
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy 2: Update access ONLY for admins (safe text cast to prevent text = uuid error)
CREATE POLICY "Allow update access only for admins"
ON public.feature_flags
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id::text = auth.uid()::text
      AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id::text = auth.uid()::text
      AND profiles.role = 'admin'
  )
);

-- Policy 3: Insert access ONLY for admins
CREATE POLICY "Allow insert access only for admins"
ON public.feature_flags
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id::text = auth.uid()::text
      AND profiles.role = 'admin'
  )
);

-- 4. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';
