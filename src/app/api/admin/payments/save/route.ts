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
    const { payment } = body;

    if (!payment || !payment.method_name || !payment.account_number) {
      return NextResponse.json({ ok: false, error: 'Valid payment method details required.' }, { status: 400 });
    }

    const holder = (payment.account_holder || payment.account_name || payment.account_title || '').trim();
    const payload: any = {
      method_name: payment.method_name.trim(),
      account_number: payment.account_number.trim(),
      account_holder: holder,
      account_name: holder,
      account_title: holder,
      is_active: payment.is_active !== false,
      instructions: payment.instructions || '',
    };

    let result = null;

    if (payment.id) {
      const { data, error } = await serverAdminSupabase
        .from('payment_methods')
        .update(payload)
        .eq('id', payment.id)
        .select()
        .maybeSingle();

      if (error) {
        // Fallback without duplicate columns if table doesn't have all three
        const fallbackPayload = {
          method_name: payment.method_name.trim(),
          account_number: payment.account_number.trim(),
          account_name: holder,
          is_active: payment.is_active !== false,
        };
        const fbRes = await serverAdminSupabase
          .from('payment_methods')
          .update(fallbackPayload)
          .eq('id', payment.id)
          .select()
          .maybeSingle();
        if (fbRes.error) return NextResponse.json({ ok: false, error: fbRes.error.message }, { status: 500 });
        result = fbRes.data;
      } else {
        result = data;
      }
    } else {
      const { data, error } = await serverAdminSupabase
        .from('payment_methods')
        .insert(payload)
        .select()
        .maybeSingle();

      if (error) {
        const fallbackPayload = {
          method_name: payment.method_name.trim(),
          account_number: payment.account_number.trim(),
          account_name: holder,
          is_active: payment.is_active !== false,
        };
        const fbRes = await serverAdminSupabase
          .from('payment_methods')
          .insert(fallbackPayload)
          .select()
          .maybeSingle();
        if (fbRes.error) return NextResponse.json({ ok: false, error: fbRes.error.message }, { status: 500 });
        result = fbRes.data;
      } else {
        result = data;
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Payment method saved successfully via service role.',
      payment: result,
    });
  } catch (err: any) {
    console.error('API /api/admin/payments/save error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
