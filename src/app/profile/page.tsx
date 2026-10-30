'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { AppPageShell } from '@/src/components/AppPageShell';
import { supabase, clearUserLocalSessionCache } from '@/src/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

const ProfileView = dynamic(
  () => import('@/src/views/ProfileView').then((m) => m.ProfileView),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Profile & Wallet...</p>
      </div>
    ),
  }
);

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams?.get('view') || 'main';

  const handleLogout = async () => {
    clearUserLocalSessionCache();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AppPageShell activeTab="profile" requireAuth={true}>
      <ProfileView onLogout={handleLogout} initialSubView={view as any} />
    </AppPageShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Profile...</p>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
