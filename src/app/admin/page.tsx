'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { TactileThemeProvider } from '@/src/context/TactileThemeContext';
import { AdminSecurityGate } from '@/src/components/AdminSecurityGate';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

const AdminView = dynamic(
  () => import('@/src/views/AdminView').then((m) => m.AdminView),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-black uppercase tracking-widest text-emerald-400">Loading Secure Admin Panel...</p>
      </div>
    ),
  }
);

export default function AdminPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  return (
    <TactileThemeProvider defaultTheme="astro-neu" defaultFont="tech-modern">
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Admin Navigation Bar */}
        <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Site</span>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="text-emerald-400" size={18} />
              <span className="text-sm font-black tracking-wide text-white uppercase">Admin Portal</span>
            </div>
          </div>
          {isUnlocked && (
            <button
              onClick={() => {
                sessionStorage.removeItem('admin_gate_unlocked');
                sessionStorage.removeItem('admin_session_token');
                setIsUnlocked(false);
              }}
              className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-500/20 transition-colors"
            >
              Lock Console
            </button>
          )}
        </header>

        {/* Admin Content Area */}
        <main className="flex-1 w-full overflow-y-auto">
          {!isUnlocked ? (
            <div className="py-12 px-4 max-w-md mx-auto">
              <AdminSecurityGate onUnlock={() => setIsUnlocked(true)} />
            </div>
          ) : (
            <div className="w-full">
              <AdminView />
            </div>
          )}
        </main>
      </div>
    </TactileThemeProvider>
  );
}
