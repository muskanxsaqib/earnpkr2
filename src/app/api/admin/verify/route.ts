import { NextResponse } from 'next/server';
import { verifyAdminCredentials, createAdminToken } from '@/src/lib/serverAdminAuth';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const username = body?.username || body?.email || '';
    const password = body?.password || '';

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'Username/Email and password are required.' }, { status: 400 });
    }

    const isValid = await verifyAdminCredentials(username, password);
    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Invalid admin credentials.' }, { status: 401 });
    }

    const token = createAdminToken();

    return NextResponse.json({
      ok: true,
      message: 'Admin authentication successful.',
      admin_token: token,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
