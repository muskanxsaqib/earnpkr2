import { NextResponse } from 'next/server';
import { serverAdminSupabase } from '@/src/lib/serverSupabase';

/**
 * 🔒 Task Earn Hub: HttpOnly Cookie Session Gateway
 * Converts client tokens into hardened, tamper-proof HttpOnly cookies
 * that are completely inaccessible to client-side JavaScript / XSS scripts.
 */

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { access_token } = body;

    if (!access_token || typeof access_token !== 'string') {
      return NextResponse.json({ ok: false, error: 'Access token required.' }, { status: 400 });
    }

    // Verify token validity with Supabase
    const { data: { user }, error } = await serverAdminSupabase.auth.getUser(access_token);
    if (error || !user) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired session token.' }, { status: 401 });
    }

    const res = NextResponse.json({
      ok: true,
      message: 'HttpOnly secure session established successfully.',
      user: { id: user.id, email: user.email },
    });

    // Hardened HttpOnly Cookie:
    // - httpOnly: true -> Document.cookie cannot read it (Stops XSS token theft)
    // - secure: true (in production HTTPS) -> Sent only over HTTPS
    // - sameSite: 'lax' -> Prevents CSRF attacks
    // - path: '/' -> Accessible across all API endpoints
    // - maxAge: 7 days
    res.cookies.set('sb_access_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error setting session.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    let token = '';
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [k, ...v] = c.trim().split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      token = cookies['sb_access_token'] || '';
    }

    if (!token) {
      return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
    }

    const { data: { user }, error } = await serverAdminSupabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      authenticated: true,
      user: { id: user.id, email: user.email },
    });
  } catch {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({
    ok: true,
    message: 'HttpOnly session cleared successfully.',
  });

  res.cookies.set('sb_access_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return res;
}
