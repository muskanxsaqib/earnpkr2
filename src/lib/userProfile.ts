import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  phone?: string | null;
  referral_code: string;
  referred_by?: string | null;
  role: 'admin' | 'user';
  balance: number;
  total_earnings?: number;
  status?: string;
  created_at?: string;
  active_plans?: any[];
  active_plan_ids?: any[];
  [key: string]: any;
}

export async function fetchCurrentUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return null;

    // 1. Primary: Server-side route using service role key (bypasses RLS recursion)
    if (session?.access_token) {
      try {
        const res = await fetch('/api/user/profile', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.ok && json.profile) {
            return json.profile;
          }
        }
      } catch (apiErr) {
        console.warn('API profile fetch error:', apiErr);
      }
    }

    // 2. Secondary fallback: Direct Supabase client query
    const { data: directData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (directData) {
      return directData;
    }

    // 3. Fallback: Clean profile from user metadata (strictly NO random suffixes)
    const cleanUsername = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
    return {
      id: user.id,
      email: user.email || '',
      username: cleanUsername,
      phone: user.user_metadata?.phone || '',
      referral_code: user.user_metadata?.referral_code || '',
      role: ['saqibsaqqibsaqib@gmail.com', 'saqib242saqib@gmail.com', 'admin@gmail.com'].includes(user.email || '') ? 'admin' : 'user',
      balance: 0,
      total_earnings: 0,
      status: 'active',
    };
  } catch (err) {
    console.error('Error in fetchCurrentUserProfile:', err);
    return null;
  }
}
