import { NextResponse } from 'next/server';
import { serverAdminSupabase, getClientIp } from '@/src/lib/serverSupabase';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      username,
      email,
      password,
      phone,
      full_name,
      referral_code,
      device_id,
      fingerprint,
      country,
      city,
    } = body;

    const clientIp = getClientIp(req);
    const cleanUsername = String(username || '').trim().toLowerCase();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    const cleanPhone = String(phone || '').trim().replace(/\D/g, '');
    const cleanDeviceId = String(device_id || '').trim();
    const cleanFingerprint = String(fingerprint || '').trim();
    const cleanReferral = String(referral_code || '').trim() || null;
    const cleanFullName = String(full_name || username || '').trim();
    const cleanCountry = String(country || 'Pakistan').trim();
    const cleanCity = String(city || 'Karachi').trim();

    if (!cleanUsername) {
      return NextResponse.json({ ok: false, error: 'Username likhna zaroori hai.' }, { status: 400 });
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Durust email address likhein.' }, { status: 400 });
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return NextResponse.json({ ok: false, error: 'Password kam az kam 6 characters ka hona chahiye.' }, { status: 400 });
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

    // 3. Check IP address restriction
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
      .ilike('username', cleanUsername)
      .limit(1);

    if (existingUser && existingUser.length > 0) {
      return NextResponse.json({
        ok: false,
        error: 'Yeh Username pehle se kisi aur ka hai. Koi doosra unique username chunein.',
      }, { status: 400 });
    }

    // 6. Check Unique Email in profiles
    const { data: existingEmail } = await serverAdminSupabase
      .from('profiles')
      .select('id')
      .ilike('email', cleanEmail)
      .limit(1);

    if (existingEmail && existingEmail.length > 0) {
      return NextResponse.json({
        ok: false,
        error: 'Yeh Email pehle se registered hai. Baraye meharbani Login karein.',
      }, { status: 400 });
    }

    // 7. CREATE USER VIA ADMIN API WITH INSTANT EMAIL CONFIRMATION!
    const { data: authUser, error: authErr } = await serverAdminSupabase.auth.admin.createUser({
      email: cleanEmail,
      password: cleanPassword,
      email_confirm: true, // Auto-confirm email to bypass Supabase confirmation blocker
      user_metadata: {
        full_name: cleanFullName,
        username: cleanUsername,
        phone: cleanPhone,
        referred_by: cleanReferral,
        device_id: cleanDeviceId,
        last_ip: clientIp,
        country: cleanCountry,
        city: cleanCity,
      },
    });

    if (authErr) {
      let friendlyError = authErr.message;
      if (friendlyError.toLowerCase().includes('already registered')) {
        friendlyError = 'Yeh Email pehle se registered hai. Baraye meharbani Login karein.';
      }
      return NextResponse.json({ ok: false, error: friendlyError }, { status: 400 });
    }

    const createdUserId = authUser?.user?.id;

    // 8. Ensure profiles table is updated with all metadata
    if (createdUserId) {
      await serverAdminSupabase
        .from('profiles')
        .update({
          full_name: cleanFullName,
          username: cleanUsername,
          phone: cleanPhone,
          device_id: cleanDeviceId,
          last_ip: clientIp,
          country: cleanCountry,
          city: cleanCity,
        })
        .eq('id', createdUserId);
    }

    return NextResponse.json({
      ok: true,
      message: 'Account successfully registered and confirmed.',
      userId: createdUserId,
      email: cleanEmail,
    });
  } catch (err: any) {
    console.error('API /api/auth/register error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Server error during registration.' }, { status: 500 });
  }
}
