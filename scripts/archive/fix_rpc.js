import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_statement: `
CREATE OR REPLACE FUNCTION public.approve_deposit(p_deposit_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_plan_id bigint;
  v_platform_method_id bigint;
  v_sender_account_name text;
  v_sender_account_number text;
  v_screenshot_url text;
  v_amount numeric;
  v_daily_reward numeric;
  i int;
BEGIN
  -- Safely ensure start_date column exists in public.user_plans
  BEGIN
    ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS start_date timestamp with time zone;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Update deposit status to approved
  UPDATE public.deposits SET status = 'approved', receipt_url = COALESCE(receipt_url, screenshot_url) WHERE id = p_deposit_id;

  -- Fetch deposit details
  SELECT user_id, plan_id, platform_method_id, user_account_name, user_account_number, screenshot_url, amount
  INTO v_user_id, v_plan_id, v_platform_method_id, v_sender_account_name, v_sender_account_number, v_screenshot_url, v_amount
  FROM public.deposits
  WHERE id = p_deposit_id;

  -- Ensure v_platform_method_id is valid or exists
  IF v_platform_method_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.payment_methods WHERE id = v_platform_method_id) THEN
    SELECT id INTO v_platform_method_id FROM public.payment_methods WHERE is_active = true LIMIT 1;
    IF v_platform_method_id IS NULL THEN
      SELECT id INTO v_platform_method_id FROM public.payment_methods LIMIT 1;
    END IF;
  END IF;

  IF v_user_id IS NOT NULL THEN
    -- Insert or update user plan
    INSERT INTO public.user_plans (
      id,
      user_id,
      plan_id,
      status,
      admin_payment_method_id,
      sender_account_name,
      sender_account_number,
      receipt_image_url,
      created_at,
      approved_at,
      start_date
    ) VALUES (
      p_deposit_id,
      v_user_id,
      v_plan_id,
      'active',
      COALESCE(v_platform_method_id, 1),
      COALESCE(v_sender_account_name, 'Unknown'),
      COALESCE(v_sender_account_number, 'Unknown'),
      COALESCE(v_screenshot_url, ''),
      now(),
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      status = 'active',
      approved_at = now(),
      start_date = now();

    -- Fetch daily reward amount
    SELECT COALESCE(daily_reward, daily_return, 0)
    INTO v_daily_reward
    FROM public.plans
    WHERE id = v_plan_id;

    IF v_daily_reward IS NULL OR v_daily_reward = 0 THEN
      v_daily_reward := COALESCE(v_amount, 0) * 0.05;
    END IF;

    -- Generate 30 daily rewards
    FOR i IN 1..30 LOOP
      INSERT INTO public.daily_rewards (
        user_plan_id,
        user_id,
        day_number,
        status,
        reward_amount
      ) VALUES (
        p_deposit_id,
        v_user_id,
        i,
        'pending',
        COALESCE(v_daily_reward, 0)
      )
      ON CONFLICT (user_plan_id, day_number) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;
` });
  console.log("Execute rpc update:", data, error);
}
check();
