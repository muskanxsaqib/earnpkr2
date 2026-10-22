'use client';

import { useState, useEffect } from 'react';
import { Database, ExternalLink, Copy, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export function DatabaseSetupBanner() {
  const [setupInfo, setSetupInfo] = useState<{
    isConfigured: boolean;
    isTablesReady: boolean;
    projectRef: string | null;
    sqlEditorUrl: string;
    tableError?: string | null;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    // Only check in development or if user wants setup check
    let isMounted = true;
    const checkSetup = async () => {
      try {
        const res = await fetch('/api/setup', { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (isMounted && json?.ok) {
          setSetupInfo({
            isConfigured: json.isConfigured,
            isTablesReady: json.isTablesReady,
            projectRef: json.projectRef,
            sqlEditorUrl: json.sqlEditorUrl,
            tableError: json.tableError,
          });
        }
      } catch {
        // Ignore network errors
      }
    };

    checkSetup();
    return () => {
      isMounted = false;
    };
  }, []);

  // If tables are already ready or user dismissed, don't render anything
  if (!setupInfo || setupInfo.isTablesReady || dismissed) {
    return null;
  }

  const handleCopyAndOpen = async () => {
    setIsCopying(true);
    try {
      const res = await fetch('/api/setup', { method: 'POST' });
      const json = await res.json();
      if (json?.ok && json.sql) {
        await navigator.clipboard.writeText(json.sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 5000);
      }
    } catch (err) {
      console.error('Failed to copy schema:', err);
    } finally {
      setIsCopying(false);
      // Open Supabase SQL editor in new tab
      window.open(setupInfo.sqlEditorUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 text-white shadow-lg sticky top-0 z-[9999] border-b border-amber-400">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <span className="p-2 bg-amber-700/50 rounded-xl shrink-0">
              <Database className="w-5 h-5 text-amber-200 animate-pulse" />
            </span>
            <div>
              <p className="text-sm font-bold flex items-center justify-center sm:justify-start gap-1.5">
                <span>New Database Detected!</span>
                <span className="text-xs bg-amber-900/60 px-2 py-0.5 rounded-full font-mono text-amber-200">
                  {setupInfo.projectRef || 'Supabase'}
                </span>
              </p>
              <p className="text-xs text-amber-100 font-medium">
                Tables are not yet created in your new Supabase project. Initialize with 1-click to enable all 18 tables and features.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyAndOpen}
              disabled={isCopying}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-900 hover:bg-black text-amber-300 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>SQL Copied! (Paste &amp; RUN)</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>1-Click Copy &amp; Open SQL</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </>
              )}
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-amber-200 hover:text-white hover:bg-amber-700/50 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
