import { NextResponse } from 'next/server';
import { getClientIp } from '@/src/lib/serverSupabase';

export async function GET(req: Request) {
  const ip = getClientIp(req);
  return NextResponse.json({ ok: true, ip });
}
