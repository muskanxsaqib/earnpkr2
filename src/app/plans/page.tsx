'use client';

import dynamic from 'next/dynamic';
import { AppPageShell } from '@/src/components/AppPageShell';

const PackagesView = dynamic(
  () => import('@/src/views/PackagesView').then((m) => m.PackagesView),
  {
    ssr: false,
    loading: () => (
      <div className="p-4 space-y-6 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-200 rounded-xl"></div>
          <div className="h-10 w-full bg-slate-100 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-72 bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-28 bg-slate-200 rounded-md"></div>
                  <div className="h-3 w-20 bg-slate-100 rounded-md"></div>
                </div>
              </div>
              <div className="h-12 bg-slate-100 rounded-2xl"></div>
              <div className="h-11 bg-slate-200 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    ),
  }
);

export default function PlansPage() {
  return (
    <AppPageShell activeTab="packages">
      <PackagesView />
    </AppPageShell>
  );
}
