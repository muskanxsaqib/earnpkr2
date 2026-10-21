-- ==============================================================================
-- 🌐 MULTI-CURRENCY & EXCHANGE RATES SYSTEM MIGRATION (TASK EARN HUB)
-- Supports: Pakistani Rupee (PKR - Rs.), US Dollar (USD - $), 
--           Indian Rupee (INR - ₹), and Tether USD (USDT - ₮)
-- 
-- 🛡️ STRICT ZERO-LOSS ARCHITECTURE GUARANTEE:
-- Base database accounting currency strictly remains PKR (Rs.) in 
-- profiles.balance, deposits.amount, and withdrawals.amount.
-- Multi-currency operates dynamically on presentation layer with Admin-managed rates!
-- ==============================================================================

-- 1. Ensure public.app_settings table exists
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on app_settings if not enabled
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to app_settings (if policy does not exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'app_settings' AND policyname = 'Public read app_settings'
  ) THEN
    CREATE POLICY "Public read app_settings" ON public.app_settings
      FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- 2. Seed Default Multi-Currency Configuration (Idempotent UPSERT)
INSERT INTO public.app_settings (setting_key, setting_value)
VALUES 
  ('default_platform_currency', 'PKR'),
  ('allow_user_currency_switch', 'true'),
  ('currency_rates_json', '{"USD":280,"INR":3.35,"USDT":280}')
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = timezone('utc'::text, now());

-- 3. Verification Query: Confirm settings are active
SELECT setting_key, setting_value, updated_at 
FROM public.app_settings 
WHERE setting_key IN ('default_platform_currency', 'allow_user_currency_switch', 'currency_rates_json');
