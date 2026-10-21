/***
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Layout } from './components/Layout';

const HomeView = lazy(() => import('./views/HomeView').then(m => ({ default: m.HomeView })));
const PackagesView = lazy(() => import('./views/PackagesView').then(m => ({ default: m.PackagesView })));
const InviteView = lazy(() => import('./views/InviteView').then(m => ({ default: m.InviteView })));
const ProfileView = lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })));
const AdsView = lazy(() => import('./views/AdsView').then(m => ({ default: m.AdsView })));
const AuthView = lazy(() => import('./views/AuthView').then(m => ({ default: m.AuthView })));
const LandingView = lazy(() => import('./views/LandingView').then(m => ({ default: m.LandingView })));
const MyPlansView = lazy(() => import('./views/MyPlansView').then(m => ({ default: m.MyPlansView })));

import { TabType } from './types';
import { MarketTrends } from './components/MarketTrends';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { trackPageView } from './lib/tracking';
import { initSecurity } from './lib/sys';
import { BroadcastModal } from './components/BroadcastModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { useSiteBranding } from './lib/branding';

const ViewLoader = () => (
  <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 bg-slate-50">
    <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
    <p className="text-sm font-semibold text-slate-500">Loading Secure Components...</p>
  </div>
);

export default function App() {
  const branding = useSiteBranding();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [profileSubView, setProfileSubView] = useState<string>('main');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    initSecurity();
    // Preload core views in idle time so tab switching is 0ms instant
    const timer = setTimeout(() => {
      import('./views/HomeView');
      import('./views/PackagesView');
      import('./views/MyPlansView');
      import('./views/InviteView');
      import('./views/ProfileView');
      import('./views/AuthView');
      import('./views/LandingView');
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');

    if (ref) {
      localStorage.setItem('referred_by', ref);
      localStorage.setItem('referred_by_time', Date.now().toString());

      // Instantly remove the ref parameter from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState(null, '', url.pathname + url.search);
    }

    const initializeAuth = async () => {
      // Run page tracking, but wrap completely to ensure it never affects app initialization
      try {
        trackPageView();
      } catch (trackErr) {
        console.error("Page tracking error:", trackErr);
      }

      // Add a safety timeout so initialization never hangs infinitely
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Initialization timeout')), 4000);
      });

      const initProcess = async () => {
        const storedRef = localStorage.getItem('referred_by');
        const storedTime = localStorage.getItem('referred_by_time');
        let hasActiveReferral = false;
        if (storedRef && storedTime) {
          const elapsed = Date.now() - Number(storedTime);
          if (elapsed < 10 * 60 * 1000) {
            hasActiveReferral = true;
          } else {
            // Expired, clean it
            localStorage.removeItem('referred_by');
            localStorage.removeItem('referred_by_time');
          }
        }

        // Get session first
        let session = null;
        try {
          const { data } = await supabase.auth.getSession();
          session = data?.session || null;
        } catch (sessionErr) {
          console.error("Failed to get session:", sessionErr);
        }

        if (ref) {
          // If a ref query was present, sign out ONLY if they have an active session
          if (session) {
            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              console.error("Signout error during ref initialization:", signOutErr);
            }
          }
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!session);
          if (session) {
            try {
              await checkBanStatus(session.user.id);
            } catch (banErr) {
              console.error("Ban check error:", banErr);
            }
          }
        }
      };

      try {
        await Promise.race([initProcess(), timeoutPromise]);
      } catch (err) {
        console.error("Error inside initializeAuth:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    // IMPORTANT: Never await Supabase database calls directly inside onAuthStateChange!
    // Doing so creates an internal session lock deadlock in @supabase/supabase-js that
    // causes sign-in and sign-up requests to hang indefinitely until page refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        if (ref && _event === 'INITIAL_SESSION') {
          return;
        }

        const hasSession = !!session;
        setIsAuthenticated(hasSession);

        if (session) {
          // Defer DB check to next tick so auth lock is released immediately
          setTimeout(() => {
            checkBanStatus(session.user.id).catch(err => {
              console.error("Ban check error in onAuthStateChange:", err);
            });
          }, 0);
        } else {
          setIsBanned(false);
          setBanReason(null);
          setUsername('');
        }
      } catch (err) {
        console.error("Auth state change error:", err);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkBanStatus = async (userId: string) => {
    try {
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: null }), 3000)
      );

      const res: any = await Promise.race([queryPromise, timeoutPromise]);
      const data = res?.data;
        
      if (data) {
        if (data.username) {
          setUsername(data.username);
        }
        if (data.status === 'banned' || data.is_banned === true) {
          setIsBanned(true);
          setBanReason(data.ban_reason);
        } else {
          setIsBanned(false);
          setBanReason(null);
        }
      }
    } catch (e) {
      console.error('Failed to check ban status', e);
    }
  };

  const renderView = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeView 
            onNavigateToTab={(tab, subView) => {
              setActiveTab(tab);
              if (tab === 'profile' && subView) {
                setProfileSubView(subView);
              }
            }} 
          />
        );
      case 'ads':
        return <AdsView onNavigateToPackages={() => setActiveTab('packages')} />;
      case 'packages':
        return <PackagesView />;
      case 'my-plans':
        return <MyPlansView />;
      case 'invite':
        return <InviteView />;
      case 'profile':
        return (
          <ProfileView 
            onLogout={async () => {
              await supabase.auth.signOut();
              setIsAuthenticated(false);
            }} 
            initialSubView={profileSubView as any}
          />
        );
      default:
        return <HomeView />;
    }
  };

  if (isBanned) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-red-100 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Account Suspended</h2>
          <p className="text-slate-600 mb-6">Your account has been temporarily disabled due to a violation of our terms of service.</p>
          
          {banReason && (
            <div className="bg-red-50 text-red-800 p-4 rounded-xl text-sm font-medium mb-8 text-left">
              <strong>Reason:</strong> {banReason}
            </div>
          )}
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {!isSupabaseConfigured && (
        <aside aria-label="Supabase setup alert" className="bg-amber-400 text-amber-950 px-4 py-2.5 text-xs md:text-sm font-medium sticky top-0 z-50 shadow-md border-b border-amber-500">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span><strong>Local Notice:</strong> Supabase keys missing in <code>.env</code>. Add <code>VITE_SUPABASE_URL</code> &amp; <code>VITE_SUPABASE_ANON_KEY</code> to enable signup, login &amp; earning data.</span>
            </div>
            <a 
              href="https://supabase.com" 
              target="_blank" 
              rel="noreferrer"
              className="bg-amber-950 text-white text-xs px-2.5 py-1 rounded-md font-semibold hover:bg-black transition-colors shrink-0"
            >
              Get Keys
            </a>
          </div>
        </aside>
      )}
      {!isInitializing && (
        !isAuthenticated ? (
          <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          }>
            {branding.show_landing_page !== 'false' && !showAuthScreen ? (
              <LandingView
                onOpenAuth={(mode) => {
                  setAuthMode(mode);
                  setShowAuthScreen(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : (
              <AuthView
                initialMode={authMode}
                onBackToLanding={
                  branding.show_landing_page !== 'false'
                    ? () => setShowAuthScreen(false)
                    : undefined
                }
                onLogin={() => setIsAuthenticated(true)}
              />
            )}
          </Suspense>
        ) : (
          <>
            <BroadcastModal />
            <PWAInstallButton />
            
            <Layout activeTab={activeTab} onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab === 'profile') {
                setProfileSubView('main');
              }
              const scroller = document.getElementById('app-main-scroll');
              if (scroller) scroller.scrollTop = 0;
            }}>
              <div key={activeTab} className="w-full">
                <Suspense fallback={<ViewLoader />}>
                  {renderView()}
                </Suspense>
              </div>
            </Layout>
          </>
        )
      )}
    </>
  );
}

