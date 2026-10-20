import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/src/lib/serverAdminAuth';
import { serverAdminSupabase } from '@/src/lib/serverSupabase';

export async function POST(req: Request) {
  try {
    const isAuthorized = await verifyAdminRequest(req);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: 'Unauthorized: Admin access required.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Payment method ID required.' }, { status: 400 });
    }

    const { error } = await serverAdminSupabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: 'Payment method deleted successfully.',
    });
  } catch (err: any) {
    console.error('API /api/admin/payments/delete error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
