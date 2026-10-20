import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: userPlans } = await supabase.from('user_plans').select('*').limit(1);
  if (!userPlans || userPlans.length === 0) { console.log("no user plans"); return; }
  const p = userPlans[0];
  const newRewards = [{
    user_plan_id: p.id,
    day_number: 1,
    status: 'pending',
    reward_amount: 20
  }];
  const res = await supabase.from('daily_rewards').insert(newRewards);
  console.log("Insert result:", res);
}
check();
