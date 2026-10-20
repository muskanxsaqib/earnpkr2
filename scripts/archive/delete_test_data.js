import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function cleanData() {
  console.log("Finding user...");
  // Try to find the user in profiles
  const { data: profiles, error } = await supabase.from('profiles').select('id, username, email').or('email.eq.pagal@gmail.com,username.eq.pagal@gmail.com,username.eq.pagal');
  
  if (error) console.error("Error finding profile:", error);
  
  if (profiles && profiles.length > 0) {
    const userId = profiles[0].id;
    console.log("Found user ID:", userId);
    
    const r1 = await supabase.from('deposits').delete().eq('user_id', userId);
    console.log("Deleted deposits:", r1.error || "Success");
    
    const r2 = await supabase.from('user_plans').delete().eq('user_id', userId);
    console.log("Deleted user_plans (cascades to rewards):", r2.error || "Success");
    
    const r3 = await supabase.from('withdrawals').delete().eq('user_id', userId);
    console.log("Deleted withdrawals:", r3.error || "Success");
  } else {
    console.log("Could not find user 'pagal@gmail.com' in profiles table.");
    // Try via auth.admin if service role
    const { data: usersData, error: authErr } = await supabase.auth.admin.listUsers();
    if (usersData && usersData.users) {
      const u = usersData.users.find(u => u.email === 'pagal@gmail.com');
      if (u) {
         console.log("Found user in Auth:", u.id);
         const userId = u.id;
         await supabase.from('deposits').delete().eq('user_id', userId);
         await supabase.from('user_plans').delete().eq('user_id', userId);
         await supabase.from('withdrawals').delete().eq('user_id', userId);
         console.log("Deleted user data successfully.");
      }
    }
  }
}
cleanData();
