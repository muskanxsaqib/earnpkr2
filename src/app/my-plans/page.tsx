'use client';

import dynamic from 'next/dynamic';
import { AppPageShell } from '@/src/components/AppPageShell';

const MyPlansView = dynamic(
  () => import('@/src/views/MyPlansView').then((m) => m.MyPlansView),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Your Plans...</p>
      </div>
    ),
  }
);

export default function MyPlansPage() {
  return (
    <AppPageShell activeTab="my-plans" requireAuth={true}>
      <MyPlansView />
    </AppPageShell>
  );
}
