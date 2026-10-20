'use client';

import React, { useEffect, useState, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AppPageShell } from '@/src/components/AppPageShell';
import { supabase, isSupabaseConfigured } from '@/src/lib/supabase';
import { initSecurity } from '@/src/lib/sys';
import { trackPageView } from '@/src/lib/tracking';
import { useSiteBranding } from '@/src/lib/branding';

const HomeView = dynamic(() => import('@/src/views/HomeView').then((m) => m.HomeView), {
  ssr: false,
  loading: () => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Dashboard...</p>
    </div>
  ),
});

const LandingView = dynamic(() => import('@/src/views/LandingView').then((m) => m.LandingView), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-10 h-10 border-4 border-white/20 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
      <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">Loading Earning Hub...</p>
    </div>
  ),
});

export default function HomePage() {
  const router = useRouter();
  const branding = useSiteBranding();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);

  useEffect(() => {
    initSecurity();
    try {
      trackPageView();
    } catch (e) {
      // Ignore tracking errors
    }

    // Catch ref param from URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        localStorage.setItem('referred_by', ref);
        localStorage.setItem('referred_by_time', Date.now().toString());
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState(null, '', url.pathname + url.search);
      }
    }

    let mounted = true;

    const checkBan = async (userId: string) => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('status, is_banned, ban_reason')
          .eq('id', userId)
          .maybeSingle();

        if (mounted && data) {
          if (data.status === 'banned' || data.is_banned === true) {
            setIsBanned(true);
            setBanReason(data.ban_reason || 'Account suspended by administrator');
          }
        }
      } catch (err) {
        console.error('Error checking ban status:', err);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        const sess = data?.session || null;
        setSession(sess);
        setLoading(false);
        if (sess?.user?.id) {
          checkBan(sess.user.id);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setLoading(false);
        if (newSession?.user?.id) {
          checkBan(newSession.user.id);
        } else {
          setIsBanned(false);
          setBanReason(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-10 h-10 border-4 border-white/20 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Portal...</p>
      </div>
    );
  }

  if (isBanned) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Account Suspended</h2>
          <p className="text-sm text-slate-400 mb-6">Your account has been deactivated due to terms violation.</p>
          {banReason && (
            <div className="bg-red-950/50 border border-red-500/30 text-red-200 p-3.5 rounded-xl text-xs font-semibold mb-6 text-left">
              <strong>Reason:</strong> {banReason}
            </div>
          )}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-extrabold py-3 rounded-xl transition-colors cursor-pointer text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LandingView
        onOpenAuth={(mode) => {
          router.push(`/auth?mode=${mode}`);
        }}
      />
    );
  }

  return (
    <AppPageShell activeTab="home">
      <HomeView
        onNavigateToTab={(tab, subView) => {
          switch (tab) {
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
              router.push('/profile' + (subView ? `?view=${subView}` : ''));
              break;
            case 'ads':
              router.push('/tasks');
              break;
            default:
              break;
          }
        }}
      />
    </AppPageShell>
  );
}
