import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, Package, Users, User, Gift, RefreshCw, Smartphone, Download } from 'lucide-react';
import { TabType } from '../types';
import { useSiteBranding, BRAND_ICON_PRESETS, renderBrandPresetIcon } from '../lib/branding';
import { useTactileTheme } from '../context/TactileThemeContext';
import dynamic from 'next/dynamic';

const ThemeStudioTriggerButton = dynamic(
  () => import('./ThemeFontStudioModal').then((m) => m.ThemeStudioTriggerButton),
  { ssr: false }
);

const CurrencySwitcherTrigger = dynamic(
  () => import('./CurrencySwitcherModal').then((m) => m.CurrencySwitcherTrigger),
  { ssr: false }
);

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  onTabChange?: (tab: TabType) => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const branding = useSiteBranding();
  const { theme, currentThemeMeta } = useTactileTheme();
  const isDarkTheme = Boolean(currentThemeMeta?.isDark || theme === 'neo-gray-dark' || theme === 'neo-blue-dark');
  const activePreset = BRAND_ICON_PRESETS.find((p) => p.key === branding.site_icon_preset) || BRAND_ICON_PRESETS[0];

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      window.location.reload();
    }, 600000);
    return () => clearInterval(refreshInterval);
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Home', href: '/' },
    { id: 'packages', icon: Package, label: 'Packages', href: '/plans' },
    { id: 'my-plans', icon: Gift, label: 'My Plans', href: '/my-plans' },
    { id: 'invite', icon: Users, label: 'Invite', href: '/invite' },
    { id: 'profile', icon: User, label: 'Profile', href: '/profile' },
  ] as const;

  const PWAInstallMenuItem = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const handler = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsVisible(true);
      };
      window.addEventListener('beforeinstallprompt', handler);
      
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(false);
      }
      
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    if (!isVisible) return null;

    return (
      <button
        onClick={async () => {
          if (!deferredPrompt) return;
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') setIsVisible(false);
          setDeferredPrompt(null);
        }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-colors duration-150 border mt-3 group cursor-pointer ${
          isDarkTheme
            ? 'text-emerald-400 hover:bg-emerald-500/15 border-emerald-500/30 bg-emerald-500/10'
            : 'text-emerald-700 hover:bg-emerald-100/80 border-emerald-300 bg-emerald-50/90 shadow-xs'
        }`}
      >
        <Smartphone size={18} className="group-hover:scale-105 transition-transform" />
        <div className="text-left">
          <span className="text-[12px] font-extrabold block leading-none">Install App</span>
          <span className="text-[9px] opacity-75 block uppercase tracking-tighter mt-1 font-bold">Premium Access</span>
        </div>
        <Download size={13} className="ml-auto opacity-70" />
      </button>
    );
  };

  return (
    <div className="fixed inset-0 w-full h-screen h-[100dvh] bg-slate-950 text-slate-800 flex justify-center items-center font-sans overflow-hidden">
      {/* Main Container - Full-screen fluid layout across Mobile & Desktop */}
      <div className="app-window-frame w-full h-full max-w-none relative flex flex-col md:flex-row overflow-hidden z-10">
        
        {/* Desktop Sidebar (Left Panel) - Visible on md and up */}
        <aside
          className={`app-sidebar hidden md:flex flex-col w-64 lg:w-72 p-5 justify-between select-none shrink-0 z-20 border-r ${
            isDarkTheme
              ? 'bg-slate-950/95 border-white/10 text-slate-100'
              : 'bg-[#e8ecf2]/95 border-white/80 text-slate-800'
          }`}
        >
          <div className="space-y-6">
            {/* Brand Logo Header with Desktop Refresh Button */}
            <div
              className={`flex items-center justify-between gap-2 p-2.5 rounded-2xl border ${
                isDarkTheme
                  ? 'bg-slate-900/80 border-white/10'
                  : 'bg-white/80 border-white/90 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div 
                  suppressHydrationWarning
                  className={`w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-emerald-500/15 shrink-0 border border-white/20 flex items-center justify-center bg-gradient-to-br ${activePreset.gradient}`}
                >
                  {branding.site_icon_preset === 'custom_image' && branding.site_logo_url ? (
                    <img 
                      src={branding.site_logo_url} 
                      alt={branding.site_name || 'Earning Hub'} 
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://ik.imagekit.io/19imy4f1u/lite_1783801856823_8COA8zmhu.webp';
                      }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    renderBrandPresetIcon(branding.site_icon_preset, 20, 'text-white drop-shadow-sm')
                  )}
                </div>
                <div className="min-w-0">
                  <h2
                    className={`text-sm font-black tracking-tight leading-tight uppercase truncate ${
                      isDarkTheme ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {branding.site_name}
                  </h2>
                  {branding.site_tagline && (
                    <span
                      className={`text-[9px] font-extrabold tracking-widest uppercase mt-0.5 block truncate ${
                        isDarkTheme ? 'text-emerald-400' : 'text-emerald-700'
                      }`}
                    >
                      {branding.site_tagline}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <CurrencySwitcherTrigger />
                <button
                  onClick={handleRefresh}
                  title="Refresh Page"
                  className={`p-2 rounded-xl border transition-transform active:scale-95 shrink-0 cursor-pointer ${
                    isDarkTheme
                      ? 'bg-slate-800/80 border-white/15 text-slate-200 hover:text-white'
                      : 'bg-slate-100/90 border-slate-200/80 text-slate-700 hover:text-emerald-700'
                  }`}
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* Sidebar Navigation Links */}
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    prefetch={true}
                    onClick={() => onTabChange?.(item.id)}
                    className={`app-sidebar-nav-btn group w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-extrabold text-[13px] tracking-wide transition-colors duration-150 cursor-pointer ${
                      isActive 
                        ? 'is-active bg-gradient-to-r from-[#0F7A50] to-[#128a5c] text-white shadow-md shadow-emerald-900/25' 
                        : isDarkTheme
                        ? 'bg-slate-900/65 text-slate-200 hover:text-white hover:bg-slate-800/90 border border-white/10'
                        : 'bg-white/85 text-slate-800 hover:text-[#0F7A50] hover:bg-white border border-slate-200/80 shadow-xs'
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.5 : 2.2}
                      className={
                        isActive
                          ? 'text-white'
                          : isDarkTheme
                          ? 'text-slate-300 group-hover:text-emerald-400'
                          : 'text-slate-700 group-hover:text-[#0F7A50]'
                      }
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}

              {/* PWA Install Button in Sidebar */}
              <PWAInstallMenuItem />

              {/* Theme, Font & Sound Studio Button in Desktop Sidebar */}
              <div className="pt-1.5 space-y-2">
                <ThemeStudioTriggerButton
                  className={`w-full justify-start px-4 py-3 rounded-2xl font-extrabold border ${
                    isDarkTheme
                      ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-100 border-white/15'
                      : 'bg-white/90 hover:bg-white text-slate-800 border-slate-200/90 shadow-xs'
                  }`}
                />

                {/* Currency Switcher in Desktop Sidebar */}
                <CurrencySwitcherTrigger
                  showName
                  className={`w-full justify-between px-4 py-3 rounded-2xl font-extrabold border ${
                    isDarkTheme
                      ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-100 border-white/15'
                      : 'bg-white/90 hover:bg-white text-slate-800 border-slate-200/90 shadow-xs'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Secure Cloud Active Indicator & Powered By at Bottom of Sidebar */}
          <div className="space-y-3 pt-4">
            <div
              className={`rounded-2xl p-3.5 text-center border ${
                isDarkTheme
                  ? 'bg-slate-900/70 border-white/10'
                  : 'bg-white/75 border-slate-200/80 shadow-inner'
              }`}
            >
              <p
                className={`text-[9px] font-extrabold uppercase tracking-widest mb-1 ${
                  isDarkTheme ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Network Status
              </p>
              <div
                className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold ${
                  isDarkTheme ? 'text-emerald-400' : 'text-emerald-700'
                }`}
              >
                <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                <span>Secure Cloud Port Active</span>
              </div>
            </div>

            <div className="px-2 text-center">
              <p
                className={`text-[9px] font-extrabold uppercase tracking-widest truncate ${
                  isDarkTheme ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                © 2026 {branding.site_name}
              </p>
              {branding.site_tagline && (
                <p
                  className={`text-[10px] font-black uppercase tracking-tighter mt-0.5 truncate ${
                    isDarkTheme ? 'text-emerald-400' : 'text-emerald-700'
                  }`}
                >
                  {branding.site_tagline}
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Scrollable Area */}
        <main
          id="app-main-scroll"
          className="app-main-canvas flex-1 w-full h-full overflow-y-auto overflow-x-hidden pb-24 md:pb-8 md:px-3 lg:px-6 custom-scrollbar relative z-10"
        >
          {children}
        </main>

        {/* Bottom Navigation Bar - Mobile only (Fast 0ms response, 44px+ hitboxes) */}
        <nav
          className={`app-bottom-nav fixed bottom-0 left-0 right-0 w-full md:hidden border-t px-2 pb-safe pt-1 z-30 shadow-[0_-8px_25px_-5px_rgba(0,0,0,0.1)] ${
            isDarkTheme
              ? 'bg-slate-950/95 border-white/10'
              : 'bg-white/95 border-slate-200/80'
          }`}
        >
          <div className="grid grid-cols-5 items-center h-15 gap-1 max-w-lg mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={true}
                  onClick={() => onTabChange?.(item.id)}
                  className={`app-bottom-nav-btn relative flex flex-col items-center justify-center w-full min-h-[48px] py-1 rounded-2xl transition-transform duration-100 active:scale-92 cursor-pointer select-none ${
                    isActive
                      ? isDarkTheme
                        ? 'is-active text-emerald-400 font-black bg-emerald-500/15 border border-emerald-400/30'
                        : 'is-active text-[#0F7A50] font-black bg-emerald-500/12 border border-emerald-600/20'
                      : isDarkTheme
                      ? 'text-slate-300 hover:text-white font-bold'
                      : 'text-slate-700 hover:text-slate-950 font-extrabold'
                  }`}
                >
                  <div className="relative flex flex-col items-center gap-0.5">
                    <Icon 
                      size={20}
                      strokeWidth={isActive ? 2.6 : 2.2}
                      className={
                        isActive 
                          ? isDarkTheme
                            ? 'scale-105 text-emerald-400'
                            : 'scale-105 text-[#0F7A50]'
                          : isDarkTheme
                          ? 'text-slate-300'
                          : 'text-slate-700'
                      } 
                    />
                    <span className="text-[10px] tracking-tight leading-none whitespace-nowrap">{item.label}</span>
                  </div>

                  {/* Active dot indicator */}
                  {isActive && (
                    <span
                      className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                        isDarkTheme ? 'bg-emerald-400' : 'bg-[#0F7A50]'
                      }`}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

      </div>
    </div>
  );
}
