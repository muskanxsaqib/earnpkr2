/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

// Direct literal references so Next.js Turbopack can statically inline them into client bundle
const nextUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const nextAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let viteUrl = '';
let viteAnonKey = '';
try {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    viteUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
    viteAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
  }
} catch {
  // Ignore
}

const rawUrl = (nextUrl || viteUrl || process.env.SUPABASE_URL || '').trim();
const rawAnonKey = (nextAnonKey || viteAnonKey || process.env.SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  rawUrl.trim() !== '' &&
  rawAnonKey.trim() !== '' &&
  !rawUrl.includes('your-project') &&
  !rawUrl.includes('placeholder')
);

export function getSupabaseProjectRef(): string | null {
  if (!rawUrl) return null;
  const match = rawUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
}

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder-project.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawAnonKey : 'placeholder-anon-key';

if (!isSupabaseConfigured) {
  console.warn("⚠️ Supabase environment variables are missing or placeholder. Running in local preview mode. Please configure your .env file to enable full database and authentication features.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Automatically synchronize Supabase session with secure HttpOnly cookies
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      if (session?.access_token) {
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ access_token: session.access_token }),
        });
      } else if (event === 'SIGNED_OUT') {
        await fetch('/api/auth/session', {
          method: 'DELETE',
          credentials: 'same-origin',
        });
      }
    } catch {
      // Ignore background sync errors
    }
  });
}

// Setup a global broadcast channel for real-time app state synchronization across clients
export const globalSyncChannel = supabase.channel('global-app-sync', {
  config: {
    broadcast: { self: true },
  },
});

// Immediately subscribe to the channel on client
if (typeof window !== 'undefined') {
  globalSyncChannel.subscribe((status) => {
    console.log('Global sync channel status:', status);
  });
}

export const broadcastChange = async (table: string, action: string, data: any = {}) => {
  try {
    await globalSyncChannel.send({
      type: 'broadcast',
      event: 'db_change',
      payload: { table, action, data, timestamp: Date.now() },
    });
  } catch (err) {
    console.error('Failed to broadcast change:', err);
  }
};
