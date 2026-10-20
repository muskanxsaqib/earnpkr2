import { NextResponse } from 'next/server';
import { serverAdminSupabase, getClientIp } from '@/src/lib/serverSupabase';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, email, phone, device_id, fingerprint } = body;
    const clientIp = getClientIp(req);

    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPhone = String(phone || '').trim().replace(/\D/g, '');
    const cleanDeviceId = String(device_id || '').trim();
    const cleanFingerprint = String(fingerprint || '').trim();

    if (!cleanUsername || !cleanEmail) {
      return NextResponse.json({ ok: false, error: 'Username aur Email zaroori hain.' }, { status: 400 });
    }

    // 1. Fetch app settings for multi-account restrictions
    const { data: settingsRows } = await serverAdminSupabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['restrict_multiple_accounts', 'restrict_same_ip']);

    const settingsMap: Record<string, string> = {};
    (settingsRows || []).forEach((row: any) => {
      settingsMap[row.setting_key] = row.setting_value;
    });

    const isDeviceRestrictionOn = settingsMap['restrict_multiple_accounts'] !== 'false';
    const isIpRestrictionOn = settingsMap['restrict_same_ip'] === 'true';

    // 2. Check Device ID & Hardware Fingerprint restriction
    if (isDeviceRestrictionOn && cleanDeviceId) {
      // Check exact device_id
      const { data: existingDevice } = await serverAdminSupabase
        .from('profiles')
        .select('id, username')
        .eq('device_id', cleanDeviceId)
        .limit(1);

      if (existingDevice && existingDevice.length > 0) {
        return NextResponse.json({
          ok: false,
          error: `Is device se pehle hi account (${existingDevice[0].username}) registered hai. Aik device par doosra account banana sakht mana hai.`,
        }, { status: 403 });
      }

      // Check hardware fingerprint in device_id string (to catch incognito / browser hopping on same physical device)
      if (cleanFingerprint && cleanFingerprint.length > 6) {
        const { data: existingFingerprint } = await serverAdminSupabase
          .from('profiles')
          .select('id, username')
          .ilike('device_id', `%${cleanFingerprint}%`)
          .limit(1);

        if (existingFingerprint && existingFingerprint.length > 0) {
          return NextResponse.json({
            ok: false,
            error: `Is device / hardware se pehle hi account (${existingFingerprint[0].username}) registered hai. Incognito ya doosra browser use karke doosra account banana mana hai.`,
          }, { status: 403 });
        }
      }
    }

    // 3. Check IP address restriction (if enabled by admin)
    if (isIpRestrictionOn && clientIp && clientIp !== '127.0.0.1' && clientIp !== 'Unknown') {
      const { data: existingIp } = await serverAdminSupabase
        .from('profiles')
        .select('id, username')
        .eq('last_ip', clientIp)
        .limit(1);

      if (existingIp && existingIp.length > 0) {
        return NextResponse.json({
          ok: false,
          error: `Aapke IP network (${clientIp}) se pehle hi account (${existingIp[0].username}) registered hai. Aik network par doosra account banana allow nahi hai.`,
        }, { status: 403 });
      }
    }

    // 4. Check Unique Phone
    if (cleanPhone && cleanPhone.length >= 7) {
      const { data: existingPhone } = await serverAdminSupabase
        .from('profiles')
        .select('id, username')
        .ilike('phone', `%${cleanPhone}%`)
        .limit(1);

      if (existingPhone && existingPhone.length > 0) {
        return NextResponse.json({
          ok: false,
          error: `Yeh phone number (${cleanPhone}) pehle se registered hai. Har account ke liye unique number zaroori hai.`,
        }, { status: 400 });
      }
    }

    // 5. Check Unique Username
    const { data: existingUser } = await serverAdminSupabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      return NextResponse.json({
        ok: false,
        error: 'Yeh Username pehle se kisi aur ka hai. Koi doosra unique username chunein.',
      }, { status: 400 });
    }

    // 6. Check Unique Email
    const { data: existingEmail } = await serverAdminSupabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .limit(1);

    if (existingEmail && existingEmail.length > 0) {
      return NextResponse.json({
        ok: false,
        error: 'Yeh Email pehle se registered hai. Baraye meharbani Login karein.',
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      ip: clientIp,
      device_id: cleanDeviceId,
    });
  } catch (err: any) {
    console.error('API /api/auth/validate-signup error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server validation error' }, { status: 500 });
  }
}
