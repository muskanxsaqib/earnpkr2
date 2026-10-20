import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_statement: `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_rewards';` });
  console.log(data, error);
}
check();
