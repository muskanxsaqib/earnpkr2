// ============================================================================
// File: src/context/TactileThemeContext.tsx
// Complete State Provider for Theme, Font, Sound Effects & Ambient RGB Lights
// Synced with Admin Global Defaults in Supabase + User Personal Browser Override
// ============================================================================

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppThemeId, AppThemeItem, APP_THEMES_CATALOG } from '../types/themeCatalog';
import { AppFontMode, APP_FONT_PACKS, injectGoogleFont } from '../types/fontCatalog';
import { soundFx } from '../utils/audioSynth';
import { supabase } from '../lib/supabase';

interface TactileThemeContextType {
  theme: AppThemeId;
  currentThemeMeta: AppThemeItem;
  font: AppFontMode;
  soundEnabled: boolean;
  rgbLightEnabled: boolean;
  allowUserThemeSwitcher: boolean;
  hasUserOverride: boolean;
  adminDefaultTheme: AppThemeId;
  adminDefaultFont: AppFontMode;
  setTheme: (t: AppThemeId) => void;
  setFont: (f: AppFontMode) => void;
  toggleSound: () => void;
  toggleRgbLight: () => void;
  resetToPlatformDefault: () => void;
  playPop: (freq?: number) => void;
  playSuccess: () => void;
  playWarning: () => void;
  playSnap: () => void;
}

const TactileThemeContext = createContext<TactileThemeContextType | undefined>(undefined);

const isValidTheme = (val: any): val is AppThemeId =>
  typeof val === 'string' && APP_THEMES_CATALOG.some((t) => t.id === val);

const isValidFont = (val: any): val is AppFontMode =>
  typeof val === 'string' && APP_FONT_PACKS.some((f) => f.id === val);

export const TactileThemeProvider: React.FC<{
  children: React.ReactNode;
  defaultTheme?: AppThemeId;
  defaultFont?: AppFontMode;
}> = ({ children, defaultTheme = 'astro-neu', defaultFont = 'tech-modern' }) => {
  // SSR-safe state initialization: start with defaults so server HTML & initial client hydration match 100%
  const [hasUserOverride, setHasUserOverride] = useState<boolean>(false);
  const [adminDefaultTheme, setAdminDefaultTheme] = useState<AppThemeId>(defaultTheme);
  const [adminDefaultFont, setAdminDefaultFont] = useState<AppFontMode>(defaultFont);
  const [allowUserThemeSwitcher, setAllowUserThemeSwitcher] = useState<boolean>(true);
  const [theme, setThemeState] = useState<AppThemeId>(defaultTheme);
  const [font, setFontState] = useState<AppFontMode>(defaultFont);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [rgbLightEnabled, setRgbLightEnabled] = useState<boolean>(true);

  // Sync Cached & Global Defaults from localStorage and Supabase `app_settings`
  useEffect(() => {
    let isMounted = true;

    // 1. Immediately sync cached user theme preferences on client mount (SSR hydration safe)
    try {
      const userOverridden = localStorage.getItem('app_user_has_override') === 'true';
      setHasUserOverride(userOverridden);

      const cachedAdminTheme = localStorage.getItem('app_admin_default_theme');
      if (isValidTheme(cachedAdminTheme)) setAdminDefaultTheme(cachedAdminTheme);

      const cachedAdminFont = localStorage.getItem('app_admin_default_font');
      if (isValidFont(cachedAdminFont)) setAdminDefaultFont(cachedAdminFont);

      const cachedUserTheme = localStorage.getItem('app_theme_mode');
      if (userOverridden && isValidTheme(cachedUserTheme)) {
        setThemeState(cachedUserTheme);
      } else if (isValidTheme(cachedAdminTheme)) {
        setThemeState(cachedAdminTheme);
      }

      const cachedUserFont = localStorage.getItem('app_font_mode');
      if (userOverridden && isValidFont(cachedUserFont)) {
        setFontState(cachedUserFont);
      } else if (isValidFont(cachedAdminFont)) {
        setFontState(cachedAdminFont);
      }

      const cachedRgb = localStorage.getItem('app_rgb_light');
      if (cachedRgb !== null) {
        setRgbLightEnabled(cachedRgb !== 'false');
      }

      const cachedSwitcher = localStorage.getItem('app_allow_user_switcher');
      if (cachedSwitcher !== null) {
        setAllowUserThemeSwitcher(cachedSwitcher !== 'false');
      }

      setSoundEnabled(!soundFx.getMuted());
    } catch {}

    const fetchGlobalThemeSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'default_theme_mode',
            'default_font_mode',
            'default_rgb_light',
            'allow_user_theme_switcher',
          ]);

        if (error || !data || !isMounted) return;

        const map: Record<string, string> = {};
        data.forEach((row: any) => {
          if (row?.setting_key) {
            map[row.setting_key] = String(row.setting_value ?? '');
          }
        });

        const dbTheme = map['default_theme_mode'];
        const dbFont = map['default_font_mode'];
        const dbRgb = map['default_rgb_light'];
        const dbAllowSwitcher = map['allow_user_theme_switcher'];

        const userOverridden = localStorage.getItem('app_user_has_override') === 'true';

        if (isValidTheme(dbTheme)) {
          setAdminDefaultTheme(dbTheme);
          try {
            localStorage.setItem('app_admin_default_theme', dbTheme);
          } catch {}
          if (!userOverridden) {
            setThemeState(dbTheme);
          }
        }

        if (isValidFont(dbFont)) {
          setAdminDefaultFont(dbFont);
          try {
            localStorage.setItem('app_admin_default_font', dbFont);
          } catch {}
          if (!userOverridden) {
            setFontState(dbFont);
          }
        }

        if (dbRgb !== undefined && dbRgb !== '' && !userOverridden) {
          const rgbOn = dbRgb !== 'false';
          setRgbLightEnabled(rgbOn);
        }

        if (dbAllowSwitcher !== undefined && dbAllowSwitcher !== '') {
          const allowed = dbAllowSwitcher !== 'false';
          setAllowUserThemeSwitcher(allowed);
          try {
            localStorage.setItem('app_allow_user_switcher', String(allowed));
          } catch {}
        }
      } catch {
        // Fallback silently to cached/default theme
      }
    };

    fetchGlobalThemeSettings();

    const handleAdminThemeBroadcast = () => {
      fetchGlobalThemeSettings();
    };
    window.addEventListener('site-theme-defaults-updated', handleAdminThemeBroadcast);

    let channel: any = null;
    try {
      const channelName = `tactile-theme-sync-${Math.random().toString(36).substring(2, 9)}`;
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'app_settings' },
          () => {
            fetchGlobalThemeSettings();
          }
        )
        .on('broadcast', { event: 'db_change' }, () => {
          fetchGlobalThemeSettings();
        })
        .subscribe();
    } catch {
      // ignore realtime errors
    }

    return () => {
      isMounted = false;
      window.removeEventListener('site-theme-defaults-updated', handleAdminThemeBroadcast);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Apply Theme CSS Class to document.body
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;

    APP_THEMES_CATALOG.forEach((t) => body.classList.remove(t.bodyClass));

    const selectedThemeObj = APP_THEMES_CATALOG.find((t) => t.id === theme) || APP_THEMES_CATALOG[0];
    if (selectedThemeObj) {
      body.classList.add(selectedThemeObj.bodyClass);
    }

    try {
      localStorage.setItem('app_theme_mode', theme);
    } catch {}
  }, [theme]);

  // Apply Font CSS Variables & Inject Google Font
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const fontObj = APP_FONT_PACKS.find((f) => f.id === font) || APP_FONT_PACKS[0];

    injectGoogleFont(fontObj.googleFontsUrl);

    const root = document.documentElement;
    root.style.setProperty('--font-display', fontObj.displayCss);
    root.style.setProperty('--font-body', fontObj.bodyCss);
    root.style.setProperty('--font-mono', fontObj.monoCss);

    try {
      localStorage.setItem('app_font_mode', font);
    } catch {}
  }, [font]);

  // Apply Ambient RGB Light Class (syncs both .rgb-light-on and .rgb-enabled)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (rgbLightEnabled) {
      document.body.classList.add('rgb-light-on');
      document.body.classList.add('rgb-enabled');
    } else {
      document.body.classList.remove('rgb-light-on');
      document.body.classList.remove('rgb-enabled');
    }
    try {
      localStorage.setItem('app_rgb_light', String(rgbLightEnabled));
    } catch {}
  }, [rgbLightEnabled]);

  // Global Tactile Audio Pop for interactive buttons & tabs across the platform
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest('button, [role="button"]');
      if (btn && !btn.hasAttribute('data-custom-sound')) {
        soundFx.playPop(540);
      }
    };
    document.addEventListener('click', handleGlobalClick, { passive: true });
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const setTheme = (nextTheme: AppThemeId) => {
    soundFx.playPop(720);
    setHasUserOverride(true);
    setThemeState(nextTheme);
    try {
      localStorage.setItem('app_user_has_override', 'true');
      localStorage.setItem('app_theme_mode', nextTheme);
    } catch {}
  };

  const setFont = (nextFont: AppFontMode) => {
    soundFx.playPop(640);
    setHasUserOverride(true);
    setFontState(nextFont);
    try {
      localStorage.setItem('app_user_has_override', 'true');
      localStorage.setItem('app_font_mode', nextFont);
    } catch {}
  };

  const toggleSound = () => {
    const isNowMuted = soundFx.toggleMute();
    setSoundEnabled(!isNowMuted);
  };

  const toggleRgbLight = () => {
    const next = !rgbLightEnabled;
    soundFx.playPop(next ? 820 : 440);
    setHasUserOverride(true);
    setRgbLightEnabled(next);
    try {
      localStorage.setItem('app_user_has_override', 'true');
    } catch {}
  };

  const resetToPlatformDefault = () => {
    soundFx.playSuccess();
    setHasUserOverride(false);
    setThemeState(adminDefaultTheme);
    setFontState(adminDefaultFont);
    try {
      localStorage.removeItem('app_user_has_override');
      localStorage.setItem('app_theme_mode', adminDefaultTheme);
      localStorage.setItem('app_font_mode', adminDefaultFont);
    } catch {}
  };

  const currentThemeMeta =
    APP_THEMES_CATALOG.find((t) => t.id === theme) || APP_THEMES_CATALOG[0];

  return (
    <TactileThemeContext.Provider
      value={{
        theme,
        currentThemeMeta,
        font,
        soundEnabled,
        rgbLightEnabled,
        allowUserThemeSwitcher,
        hasUserOverride,
        adminDefaultTheme,
        adminDefaultFont,
        setTheme,
        setFont,
        toggleSound,
        toggleRgbLight,
        resetToPlatformDefault,
        playPop: (freq) => soundFx.playPop(freq),
        playSuccess: () => soundFx.playSuccess(),
        playWarning: () => soundFx.playWarning(),
        playSnap: () => soundFx.playSnap(),
      }}
    >
      {children}
    </TactileThemeContext.Provider>
  );
};

export const useTactileTheme = () => {
  const ctx = useContext(TactileThemeContext);
  if (!ctx) {
    const defaultMeta = APP_THEMES_CATALOG[0];
    return {
      theme: 'astro-neu' as AppThemeId,
      currentThemeMeta: defaultMeta,
      font: 'tech-modern' as AppFontMode,
      soundEnabled: true,
      rgbLightEnabled: true,
      allowUserThemeSwitcher: true,
      hasUserOverride: false,
      adminDefaultTheme: 'astro-neu' as AppThemeId,
      adminDefaultFont: 'tech-modern' as AppFontMode,
      setTheme: () => {},
      setFont: () => {},
      toggleSound: () => {},
      toggleRgbLight: () => {},
      resetToPlatformDefault: () => {},
      playPop: (freq?: number) => soundFx.playPop(freq),
      playSuccess: () => soundFx.playSuccess(),
      playWarning: () => soundFx.playWarning(),
      playSnap: () => soundFx.playSnap(),
    };
  }
  return ctx;
};
