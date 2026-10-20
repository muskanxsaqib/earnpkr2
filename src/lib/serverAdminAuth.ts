import crypto from 'crypto';
import { serverAdminSupabase } from './serverSupabase';

const ADMIN_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  'earninghub_super_secret_admin_key_2026_saqib_secure_signature_981273981273';

export function createAdminToken(): string {
  const payload = {
    isAdmin: true,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
  };
  const str = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', ADMIN_SECRET).update(str).digest('hex');
  return Buffer.from(`${str}.${hmac}`).toString('base64');
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const [jsonStr, signature] = raw.split('.');
    if (!jsonStr || !signature) return false;

    const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(jsonStr).digest('hex');
    if (signature !== expectedSig) return false;

    const payload = JSON.parse(jsonStr);
    if (!payload.isAdmin || !payload.expiresAt || payload.expiresAt < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function verifyAdminRequest(req: Request): Promise<boolean> {
  const token = req.headers.get('x-admin-token') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (verifyAdminToken(token)) {
    return true;
  }

  // Also verify Supabase access token if user is signed in as an admin in browser
  if (token && token.length > 20) {
    try {
      const { data: { user } } = await serverAdminSupabase.auth.getUser(token);
      if (user) {
        if (
          user.email === 'saqib242saqib@gmail.com' ||
          user.email === 'admin@gmail.com' ||
          user.email === 'saqib@gmail.com'
        ) {
          return true;
        }

        const { data: profile } = await serverAdminSupabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'admin') {
          return true;
        }
      }
    } catch {
      // ignore token verification error
    }
  }

  return false;
}

export async function verifyAdminCredentials(username: string, password: string): Promise<boolean> {
  const cleanUser = username.trim().toLowerCase();
  const cleanPass = password.trim();

  // 1. Check default admin credentials
  if (
    (cleanUser === 'admin@gmail.com' || cleanUser === 'admin') &&
    cleanPass === 'password123'
  ) {
    return true;
  }

  // 2. Check saqib default
  if (cleanUser === 'saqib' && cleanPass === 'saqibadmin') {
    return true;
  }

  // 3. Check database SYSTEM_SECURITY configuration
  try {
    const { data } = await serverAdminSupabase
      .from('payment_methods')
      .select('account_name, account_number')
      .eq('method_name', 'SYSTEM_SECURITY')
      .maybeSingle();

    if (data) {
      const dbUser = String(data.account_name || '').trim().toLowerCase();
      const dbPassHash = String(data.account_number || '').trim();
      const passHash = crypto.createHash('sha256').update(cleanPass).digest('hex');

      if (cleanUser === dbUser && passHash === dbPassHash) {
        return true;
      }
    }
  } catch (err) {
    console.error('Admin credential check error:', err);
  }

  return false;
}
