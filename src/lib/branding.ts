import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  BadgeDollarSign,
  Crown,
  Rocket,
  Diamond,
  Flame,
  ShieldCheck,
  Trophy,
} from 'lucide-react';

export * from './brandingCore';
import {
  BrandIconPresetKey,
  SiteBranding,
  DEFAULT_SITE_BRANDING,
  BRAND_ICON_PRESETS,
  BRANDING_SETTING_KEYS,
  normalizeBranding,
} from './brandingCore';

const STORAGE_KEY = 'task_earn_hub_branding_v2';

export function getCachedBranding(): SiteBranding {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeBranding(JSON.parse(raw));
    }
  } catch {
    // ignore storage errors
  }
  return DEFAULT_SITE_BRANDING;
}

export function applyBrandingToDocument(input?: Partial<SiteBranding> | null) {
  if (typeof document === 'undefined') return;
  try {
    const branding = normalizeBranding(input);
    const fullTitle = branding.site_tagline
      ? `${branding.site_name} - ${branding.site_tagline}`
      : branding.site_name;

    document.title = fullTitle;

    const setMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', branding.site_description);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', branding.site_description);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', branding.site_description);

    if (branding.site_logo_url) {
      setMeta('meta[property="og:image"]', branding.site_logo_url);
      setMeta('meta[name="twitter:image"]', branding.site_logo_url);

      let iconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!iconLink) {
        iconLink = document.createElement('link');
        iconLink.rel = 'icon';
        document.head.appendChild(iconLink);
      }
      iconLink.href = branding.site_logo_url;
    }
  } catch {
    // Never crash on DOM meta updates
  }
}

// Singleton state & listener manager so multiple components never collide on a single Supabase channel
let currentBrandingState: SiteBranding = getCachedBranding();
const subscribers = new Set<(b: SiteBranding) => void>();
let isRealtimeInitialized = false;
let isFetchingBranding = false;

function notifySubscribers(nextBranding: SiteBranding) {
  currentBrandingState = normalizeBranding(nextBranding);
  subscribers.forEach((cb) => {
    try {
      cb(currentBrandingState);
    } catch {
      // ignore subscriber error
    }
  });
}

export function saveBrandingCache(branding: Partial<SiteBranding>) {
  const normalized = normalizeBranding({ ...currentBrandingState, ...branding });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore storage error
  }
  applyBrandingToDocument(normalized);
  notifySubscribers(normalized);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('site-branding-updated', { detail: normalized }));
  }
}

export async function refreshBrandingFromDatabase(): Promise<SiteBranding> {
  if (isFetchingBranding) return currentBrandingState;
  isFetchingBranding = true;
  try {
    // 1. Primary: Fetch through secure backend API route
    // This bypasses RLS and PostgreSQL recursion errors completely
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/branding', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json?.ok && json.branding) {
            const merged = normalizeBranding(json.branding);
            saveBrandingCache(merged);
            return merged;
          }
        }
      } catch (fetchErr) {
        // Fallback to direct client query below
      }
    }

    // 2. Secondary fallback: Direct Supabase client query
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [...BRANDING_SETTING_KEYS]);

    if (!error && data && data.length > 0) {
      const map: Record<string, string> = {};
      data.forEach((row: any) => {
        if (row && row.setting_key) {
          map[row.setting_key] = String(row.setting_value ?? '');
        }
      });

      const merged = normalizeBranding({
        site_name: map['site_name'] || DEFAULT_SITE_BRANDING.site_name,
        site_tagline:
          map['site_tagline'] !== undefined ? map['site_tagline'] : DEFAULT_SITE_BRANDING.site_tagline,
        site_description: map['site_description'] || DEFAULT_SITE_BRANDING.site_description,
        site_logo_url: map['site_logo_url'] || DEFAULT_SITE_BRANDING.site_logo_url,
        site_icon_preset: (map['site_icon_preset'] as BrandIconPresetKey) || DEFAULT_SITE_BRANDING.site_icon_preset,
        show_landing_page: map['show_landing_page'] ?? DEFAULT_SITE_BRANDING.show_landing_page,
        landing_badge: map['landing_badge'] || DEFAULT_SITE_BRANDING.landing_badge,
        landing_title: map['landing_title'] || DEFAULT_SITE_BRANDING.landing_title,
        landing_about: map['landing_about'] || DEFAULT_SITE_BRANDING.landing_about,
        landing_hero_image:
          map['landing_hero_image'] !== undefined
            ? map['landing_hero_image']
            : DEFAULT_SITE_BRANDING.landing_hero_image,
        landing_show_hero_image:
          map['landing_show_hero_image'] ?? DEFAULT_SITE_BRANDING.landing_show_hero_image,
        landing_show_live_ticker:
          map['landing_show_live_ticker'] ?? DEFAULT_SITE_BRANDING.landing_show_live_ticker,
        landing_show_about:
          map['landing_show_about'] ?? DEFAULT_SITE_BRANDING.landing_show_about,
        landing_show_steps:
          map['landing_show_steps'] ?? DEFAULT_SITE_BRANDING.landing_show_steps,
        landing_show_plans:
          map['landing_show_plans'] ?? DEFAULT_SITE_BRANDING.landing_show_plans,
        landing_show_calculator:
          map['landing_show_calculator'] ?? DEFAULT_SITE_BRANDING.landing_show_calculator,
        landing_show_stats:
          map['landing_show_stats'] ?? DEFAULT_SITE_BRANDING.landing_show_stats,
        landing_show_faq:
          map['landing_show_faq'] ?? DEFAULT_SITE_BRANDING.landing_show_faq,
        landing_step1_title:
          map['landing_step1_title'] || DEFAULT_SITE_BRANDING.landing_step1_title,
        landing_step1_desc:
          map['landing_step1_desc'] || DEFAULT_SITE_BRANDING.landing_step1_desc,
        landing_step2_title:
          map['landing_step2_title'] || DEFAULT_SITE_BRANDING.landing_step2_title,
        landing_step2_desc:
          map['landing_step2_desc'] || DEFAULT_SITE_BRANDING.landing_step2_desc,
        landing_step3_title:
          map['landing_step3_title'] || DEFAULT_SITE_BRANDING.landing_step3_title,
        landing_step3_desc:
          map['landing_step3_desc'] || DEFAULT_SITE_BRANDING.landing_step3_desc,
        landing_login_btn_text:
          map['landing_login_btn_text'] || DEFAULT_SITE_BRANDING.landing_login_btn_text,
        landing_register_btn_text:
          map['landing_register_btn_text'] || DEFAULT_SITE_BRANDING.landing_register_btn_text,
      });

      saveBrandingCache(merged);
      return merged;
    }
  } catch {
    // Fallback silently to cached/default branding
  } finally {
    isFetchingBranding = false;
  }

  applyBrandingToDocument(currentBrandingState);
  return currentBrandingState;
}

function ensureSingletonRealtimeSync() {
  if (isRealtimeInitialized || typeof window === 'undefined') return;
  isRealtimeInitialized = true;

  refreshBrandingFromDatabase();

  try {
    const uniqueChannelName = `site-branding-sync-${Math.random().toString(36).substring(2, 9)}`;
    supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          refreshBrandingFromDatabase();
        }
      )
      .on('broadcast', { event: 'db_change' }, () => {
        refreshBrandingFromDatabase();
      })
      .subscribe();
  } catch {
    // Ignore realtime subscription errors so the app never crashes
  }
}

export function useSiteBranding(): SiteBranding {
  // Always initialize with DEFAULT_SITE_BRANDING so server SSR and initial client hydration match 100%
  const [branding, setBranding] = useState<SiteBranding>(DEFAULT_SITE_BRANDING);

  useEffect(() => {
    // Immediately sync with cached branding upon mounting
    const cached = getCachedBranding();
    setBranding(cached);
    currentBrandingState = cached;

    ensureSingletonRealtimeSync();

    const listener = (next: SiteBranding) => {
      setBranding(next);
    };
    subscribers.add(listener);

    const handleWindowEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SiteBranding>;
      if (customEvent.detail) {
        setBranding(normalizeBranding(customEvent.detail));
      }
    };
    window.addEventListener('site-branding-updated', handleWindowEvent);

    // Initial fresh fetch on mount
    refreshBrandingFromDatabase();

    return () => {
      subscribers.delete(listener);
      window.removeEventListener('site-branding-updated', handleWindowEvent);
    };
  }, []);

  return branding || DEFAULT_SITE_BRANDING;
}

export function renderBrandPresetIcon(
  preset?: BrandIconPresetKey | string,
  size: number = 24,
  className: string = 'text-white'
) {
  switch (preset) {
    case 'crown':
      return React.createElement(Crown, { size, className });
    case 'rocket':
      return React.createElement(Rocket, { size, className });
    case 'diamond':
      return React.createElement(Diamond, { size, className });
    case 'flame':
      return React.createElement(Flame, { size, className });
    case 'shield':
      return React.createElement(ShieldCheck, { size, className });
    case 'trophy':
      return React.createElement(Trophy, { size, className });
    case 'dollar':
    default:
      return React.createElement(BadgeDollarSign, { size, className });
  }
}
