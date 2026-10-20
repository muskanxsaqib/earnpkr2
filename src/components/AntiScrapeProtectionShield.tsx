'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 🛡️ AntiScrapeProtectionShield
 * Adapted from Saqib Visuals Hub Security Vault
 * 
 * Features:
 * 1. Blocks right-click inspection (except inside input/textarea for pasting)
 * 2. Intercepts F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S, Ctrl+P with floating security toast
 * 3. Prevents asset and image dragging
 * 4. Active console watermark and anti-debugger halt trap
 */
export function AntiScrapeProtectionShield() {
  const pathname = usePathname();
  const [warningToast, setWarningToast] = useState<string | null>(null);

  // Admin route bypass if needed
  const isAdminRoute = pathname?.startsWith('/admin') && false; // Keep protected everywhere

  useEffect(() => {
    if (isAdminRoute) return;

    // 1. Right-Click Context Menu Protection (Allow inside inputs for easy pasting)
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      e.preventDefault();
      triggerToast('🔒 Security Notice: Right-click inspection is disabled.');
    };

    // 2. Keyboard Inspection & Save Shortcut Interception
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const code = e.code;

      // F12 (DevTools)
      if (code === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        triggerToast('⚠️ DevTools inspection is disabled by security policy.');
        return false;
      }

      // Ctrl+Shift+I / Cmd+Opt+I (Inspect Element)
      if (isCtrlOrCmd && e.shiftKey && (key === 'i' || code === 'KeyI')) {
        e.preventDefault();
        e.stopPropagation();
        triggerToast('🛡️ Developer inspection tools are disabled.');
        return false;
      }

      // Ctrl+Shift+J / Cmd+Opt+J (Console)
      if (isCtrlOrCmd && e.shiftKey && (key === 'j' || code === 'KeyJ')) {
        e.preventDefault();
        e.stopPropagation();
        triggerToast('🛡️ Console inspection is disabled.');
        return false;
      }

      // Ctrl+Shift+C (Inspect Element Picker)
      if (isCtrlOrCmd && e.shiftKey && (key === 'c' || code === 'KeyC')) {
        e.preventDefault();
        e.stopPropagation();
        triggerToast('🛡️ Element inspection is disabled.');
        return false;
      }

      // Ctrl+U / Cmd+Opt+U (View Page Source)
      if (isCtrlOrCmd && (key === 'u' || code === 'KeyU')) {
        e.preventDefault();
        e.stopPropagation();
        triggerToast('🔒 View Source is disabled on this portal.');
        return false;
      }

      // Ctrl+S / Cmd+S (Save Page As HTML Complete)
      if (isCtrlOrCmd && (key === 's' || code === 'KeyS')) {
        e.preventDefault();
        e.stopPropagation();
        triggerToast('⚠️ Save Page As is disabled. All rights reserved.');
        return false;
      }

      // Ctrl+P / Cmd+P (Print / PDF Scraping)
      if (isCtrlOrCmd && (key === 'p' || code === 'KeyP')) {
        e.preventDefault();
        e.stopPropagation();
        triggerToast('⚠️ Document printing and PDF conversion is restricted.');
        return false;
      }
    };

    // 3. Disable Dragging of Images & Assets
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.tagName === 'A') {
        e.preventDefault();
      }
    };

    // 4. Console Watermark Protection
    const showConsoleWarning = () => {
      try {
        console.clear();
        console.log(
          '%c🛑 STOP! PROTECTED SYSTEM',
          'color: #ef4444; font-size: 32px; font-weight: 900; -webkit-text-stroke: 1px black; padding: 6px;'
        );
        console.log(
          '%cTask Earn Hub — Powered by Saqib (Copyright © 2026)\nAll source code, financial algorithms, components, and pricing structures are strictly proprietary.\nUnauthorized scraping, copying, reverse-engineering, or ripping will be permanently blocked.',
          'color: #f472b6; font-size: 14px; font-weight: bold; line-height: 1.5;'
        );
      } catch {}
    };

    showConsoleWarning();

    // 5. Active Anti-Debugging Trap (Halts unauthorized debuggers if opened in production)
    const debugTrap = setInterval(() => {
      if (process.env.NODE_ENV === 'production') {
        const startTime = performance.now();
        const testFunc = new Function('debugger');
        testFunc();
        const endTime = performance.now();
        if (endTime - startTime > 100) {
          triggerToast('⚠️ Debugger halt detected. Session protected.');
          showConsoleWarning();
        }
      }
    }, 2500);

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('dragstart', handleDragStart);

    return () => {
      clearInterval(debugTrap);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('dragstart', handleDragStart);
    };
  }, [isAdminRoute]);

  const triggerToast = (msg: string) => {
    setWarningToast(msg);
    setTimeout(() => {
      setWarningToast((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  if (!warningToast) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-slate-950/95 text-white border border-rose-500/50 shadow-2xl shadow-rose-950/80 px-5 py-3 rounded-2xl backdrop-blur-xl flex items-center gap-3 text-xs font-black">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
        <span>{warningToast}</span>
      </div>
    </div>
  );
}

export default AntiScrapeProtectionShield;
