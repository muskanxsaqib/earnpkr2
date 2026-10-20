import { supabase } from './supabase';

export const getHardwareFingerprint = (): string => {
  if (typeof window === 'undefined') return 'server';
  try {
    const screenPart = `${window.screen?.width || 0}x${window.screen?.height || 0}x${window.screen?.colorDepth || 0}`;
    const cores = navigator.hardwareConcurrency || 4;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Karachi';
    const lang = navigator.language || 'en';

    // Offscreen Canvas fingerprint (GPU/OS specific)
    let canvasHash = 'c0';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 30;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#0F7A50';
        ctx.fillRect(5, 5, 50, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('EarnHub#PK', 10, 8);
        const dataUrl = canvas.toDataURL();
        let hash = 0;
        for (let i = 0; i < dataUrl.length; i++) {
          hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
          hash |= 0;
        }
        canvasHash = Math.abs(hash).toString(36);
      }
    } catch {
      // Ignore canvas security errors if any
    }

    const raw = `${screenPart}_${cores}_${tz}_${lang}_${canvasHash}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  } catch {
    return 'fp_default';
  }
};

export const getDeviceId = (): string => {
  if (typeof window === 'undefined') return 'dev_server';

  // 1. Check localStorage
  let deviceId = localStorage.getItem('device_id');

  // 2. Check Cookie fallback (restores device_id if localStorage was cleared)
  if (!deviceId && typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)__eh_dev_id=([^;]+)/);
    if (match && match[1]) {
      deviceId = decodeURIComponent(match[1]);
      localStorage.setItem('device_id', deviceId);
    }
  }

  // 3. If still not found, generate stable ID incorporating hardware fingerprint
  if (!deviceId) {
    const fp = getHardwareFingerprint();
    const randomSuffix = Math.random().toString(36).substring(2, 8) + Date.now().toString(36).slice(-4);
    deviceId = `dev_${fp}_${randomSuffix}`;
    localStorage.setItem('device_id', deviceId);
  }

  // Always keep persistent cookie synced (10 years)
  if (typeof document !== 'undefined' && deviceId) {
    document.cookie = `__eh_dev_id=${encodeURIComponent(deviceId)}; path=/; max-age=315360000; SameSite=Lax`;
  }

  return deviceId;
};

export const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return { browser: 'Unknown', os: 'Unknown', deviceType: 'Desktop' };
  }
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('SamsungBrowser')) browser = 'Samsung Browser';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
  else if (ua.includes('Trident')) browser = 'Internet Explorer';
  else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Unknown';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'MacOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('like Mac')) os = 'iOS';

  const deviceType = /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua) ? 'Mobile' : 'Desktop';

  return { browser, os, deviceType };
};

export const getBatteryAndNetwork = async () => {
  let batteryLevel = null;
  let networkType = 'Unknown';
  if (typeof window === 'undefined') {
    return { batteryLevel, networkType };
  }
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      batteryLevel = Math.round(battery.level * 100);
    }
  } catch (e) {
    // Battery API not supported or blocked
  }

  try {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      networkType = connection.effectiveType || connection.type || 'Unknown';
    }
  } catch (e) {
    // Network Information API not supported
  }

  return { batteryLevel, networkType };
};

export const trackPageView = async () => {
  if (typeof window === 'undefined') return;
  try {
    const device_id = getDeviceId();
    const { browser, os, deviceType } = getDeviceInfo();
    const { batteryLevel, networkType } = await getBatteryAndNetwork();
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const ref_code = urlParams.get('ref') || localStorage.getItem('ref_code_click') || null;

    if (urlParams.get('ref')) {
      localStorage.setItem('ref_code_click', urlParams.get('ref')!);
    }

    let ip_address = localStorage.getItem('user_ip') || 'Unknown';
    let country = localStorage.getItem('user_country') || 'Pakistan';
    let city = localStorage.getItem('user_city') || 'Karachi';

    // High performance server-side IP detection without adblock blocks
    if (ip_address === 'Unknown' || ip_address === '127.0.0.1') {
      try {
        const res = await fetch('/api/auth/client-ip');
        if (res.ok) {
          const data = await res.json();
          if (data?.ip) {
            ip_address = data.ip;
            localStorage.setItem('user_ip', ip_address);
          }
        }
      } catch (e) {
        console.warn("Client IP fetch failed:", e);
      }
    }

    await supabase.from('page_views').insert([{
      device_id,
      ip_address,
      country,
      city,
      device_type: deviceType,
      os,
      browser,
      path,
      ref_code
    }]);
  } catch (e) {
    console.error("Tracking error", e);
  }
};
