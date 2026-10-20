'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from './Layout';
import { TactileThemeProvider } from '../context/TactileThemeContext';
import { supabase } from '../lib/supabase';
import { TabType } from '../types';
import dynamic from 'next/dynamic';

const BroadcastModal = dynamic(() => import('./BroadcastModal').then((m) => m.BroadcastModal), { ssr: false });
const PWAInstallButton = dynamic(() => import('./PWAInstallButton').then((m) => m.PWAInstallButton), { ssr: false });

const AuthView = dynamic(() => import('../views/AuthView').then((m) => m.AuthView), {
  ssr: false,
  loading: () => (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Sign In...</p>
    </div>
  ),
});

export function AppPageShell({
  children,
  activeTab,
  requireAuth = false,
}: {
  children: React.ReactNode;
  activeTab: TabType;
  requireAuth?: boolean;
}) {
  const router = useRouter();

  // Initial state is strictly deterministic between SSR and Client Hydration to eliminate mismatch errors
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(requireAuth);

  useEffect(() => {
    let mounted = true;

    // 1. Instant optimistic token resolution right after hydration (dynamic project ref)
    try {
      let token = null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
          token = localStorage.getItem(k);
          break;
        }
      }
      if (token && mounted) {
        setSession({ user: true });
        setLoading(false);
      }
    } catch (e) {}

    // 2. Authoritative session check via Supabase
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data?.session || null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleTabChange = (tab: TabType) => {
    switch (tab) {
      case 'home':
        router.push('/');
        break;
      case 'packages':
        router.push('/plans');
        break;
      case 'my-plans':
        router.push('/my-plans');
        break;
      case 'invite':
        router.push('/invite');
        break;
      case 'profile':
        router.push('/profile');
        break;
      case 'ads':
        router.push('/tasks');
        break;
      default:
        router.push('/');
    }
  };

  return (
    <TactileThemeProvider defaultTheme="astro-neu" defaultFont="tech-modern">
      <BroadcastModal />
      <PWAInstallButton />
      <Layout activeTab={activeTab} onTabChange={handleTabChange}>
        {loading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-extrabold text-slate-600 uppercase tracking-widest">Ultra-Fast Loading...</p>
          </div>
        ) : requireAuth && !session ? (
          <div className="py-6 px-4 max-w-md mx-auto">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl p-4 mb-4 text-center text-sm font-bold shadow-xs">
              👋 Welcome! Please log in to view this section.
            </div>
            <AuthView onLogin={() => setSession({ user: true })} />
          </div>
        ) : (
          children
        )}
      </Layout>
    </TactileThemeProvider>
  );
}
