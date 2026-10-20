'use client';

import dynamic from 'next/dynamic';
import { AppPageShell } from '@/src/components/AppPageShell';

const InviteView = dynamic(
  () => import('@/src/views/InviteView').then((m) => m.InviteView),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Invite Center...</p>
      </div>
    ),
  }
);

export default function InvitePage() {
  return (
    <AppPageShell activeTab="invite" requireAuth={true}>
      <InviteView />
    </AppPageShell>
  );
}
