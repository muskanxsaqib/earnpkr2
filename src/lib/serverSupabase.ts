import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://mmvchbnfhnnhcrtjsmjc.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_z8-PNTbIPrII-mPZWmatrg_aOnL8X91';

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  supabaseAnonKey;

// Server client for backend database operations
export const serverAdminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Helper to extract real client IP address from request headers
export function getClientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  const realIp = request.headers.get('x-real-ip');
  const forwarded = request.headers.get('x-forwarded-for');

  let detected = (cfIp || realIp || (forwarded ? forwarded.split(',')[0].trim() : '') || '').trim();

  if (!detected || detected === '::1' || detected === '127.0.0.1') {
    return '127.0.0.1';
  }
  return detected;
}

// Helper to extract authentication token from request (HttpOnly Cookie prioritized, Bearer fallback)
export function extractTokenFromRequest(request: Request): string {
  // 1. Prioritize secure HttpOnly Cookie (Immune to JavaScript/XSS theft)
  const cookieHeader = request.headers.get('cookie') || '';
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k, decodeURIComponent(v.join('='))];
      })
    );

    if (cookies['sb_access_token']) return cookies['sb_access_token'];
    if (cookies['auth_token']) return cookies['auth_token'];

    // Check Supabase standard cookie naming pattern: sb-<ref>-auth-token
    for (const [key, val] of Object.entries(cookies)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed[0]) return parsed[0];
          if (parsed?.access_token) return parsed.access_token;
        } catch {
          if (val) return val;
        }
      }
    }
  }

  // 2. Fallback to Authorization Header
  const authHeader = request.headers.get('authorization') || '';
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

// Helper to get authenticated user from incoming Next.js Request
export async function getAuthenticatedUser(request: Request) {
  const token = extractTokenFromRequest(request);

  if (!token) {
    return { user: null, error: 'Authentication token missing. Please log in.' };
  }

  try {
    const { data: { user }, error } = await serverAdminSupabase.auth.getUser(token);
    if (error || !user) {
      return { user: null, error: error?.message || 'Invalid or expired session. Please log in again.' };
    }
    return { user, error: null, token };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Authentication verification failed.' };
  }
}
