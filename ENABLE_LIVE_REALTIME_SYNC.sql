-- ==============================================================================
-- ⚡ SUPABASE LIVE REALTIME SYNC ACTIVATION SCRIPT (ZERO REFRESH REQUIRED)
-- Platform: Task Earn Hub (Earning Hub)
-- ==============================================================================
-- INSTRUCTIONS:
-- 1. Copy this entire query.
-- 2. Go to Supabase Dashboard -> SQL Editor -> New Query.
-- 3. Paste and click "RUN".
-- 4. Result: Tamam tables (Balance, Deposits, Withdrawals, Plans, Messages, 
--    Admin Actions) LIVE broadcast hongi bina kisi page refresh ke!
-- ==============================================================================

DO $$
DECLARE
  tbl text;
  target_tables text[] := ARRAY[
    'profiles',
    'deposits',
    'withdrawals',
    'user_plans',
    'daily_rewards',
    'plans',
    'payment_methods',
    'app_settings',
    'feature_flags',
    'admin_messages',
    'notifications',
    'feedbacks',
    'ban_appeals',
    'referral_collections',
    'weekly_salary_collections',
    'transactions',
    'coupons',
    'page_views'
  ];
BEGIN
  -- 1. Ensure supabase_realtime publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- 2. Enable Realtime Replication for each table safely
  FOREACH tbl IN ARRAY target_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Add table to publication if not already a member
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = tbl
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
      END IF;

      -- Set REPLICA IDENTITY FULL so all columns are included in UPDATE broadcasts
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl);
    END IF;
  END LOOP;
END $$;

-- 3. Verification Query: Confirm all enabled tables
SELECT 
  tablename AS realtime_enabled_table,
  schemaname
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND schemaname = 'public'
ORDER BY tablename ASC;
