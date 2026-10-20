'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppPageShell } from '@/src/components/AppPageShell';
import { supabase } from '@/src/lib/supabase';

const AuthView = dynamic(
  () => import('@/src/views/AuthView').then((m) => m.AuthView),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Account Portal...</p>
      </div>
    ),
  }
);

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams?.get('mode') === 'register' ? 'register' : 'login';
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        router.replace('/profile');
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-10 h-10 border-4 border-white/20 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Verifying session...</p>
      </div>
    );
  }

  return (
    <AppPageShell activeTab="home">
      <div className="py-4 max-w-md mx-auto">
        <AuthView
          initialMode={mode}
          onLogin={() => router.push('/profile')}
          onBackToLanding={() => router.push('/')}
        />
      </div>
    </AppPageShell>
  );
}

export default function AuthPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-10 h-10 border-4 border-white/20 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Loading Auth...</p>
      </div>
    }>
      <AuthPageContent />
    </React.Suspense>
  );
}
