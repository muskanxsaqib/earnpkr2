'use client';

import { useEffect } from 'react';

/**
 * 🛡️ Task Earn Hub: Anti-Source Code Leak & Anti-Inspect Shield
 * Prevents:
 * 1. Right Click (Context Menu / Inspect Element)
 * 2. DevTools Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
 * 3. View Source Shortcuts (Ctrl+U, Cmd+Option+U)
 * 4. Save Page Shortcuts (Ctrl+S, Cmd+S)
 * 5. Drag & Drop asset scraping
 */
export default function AntiSourceProtection() {
  useEffect(() => {
    // 1. Disable Right-Click (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Intercept DevTools & View Source Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // F12 -> DevTools
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I (Inspect) or Ctrl+Shift+J (Console) or Ctrl+Shift+C (Element picker)
      if (isCtrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U (View Source)
      if (isCtrlOrCmd && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S (Save Page Source)
      if (isCtrlOrCmd && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+P (Print Page / Scrape PDF)
      if (isCtrlOrCmd && (e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 3. Disable Drag and Drop asset scraping
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // 4. Console Protection Warning & Cleansing
    const printTamperWarning = () => {
      try {
        console.clear();
        console.log(
          '%c🛑 SECURITY WARNING 🛑',
          'color: #ef4444; font-size: 24px; font-weight: bold; background: #1e1e2e; padding: 6px 12px; border-radius: 6px;'
        );
        console.log(
          '%cSource code, scripts, and network endpoints are protected by Task Earn Hub Shield.\nUnauthorized debugging, scraping, or tampering is strictly prohibited and monitored.',
          'color: #94a3b8; font-size: 13px; font-weight: 500;'
        );
      } catch {
        // Ignore
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('dragstart', handleDragStart, { capture: true });

    // Initial console warning
    printTamperWarning();

    // Periodic console cleansing to thwart debugger inspection
    const timer = setInterval(() => {
      if (process.env.NODE_ENV === 'production') {
        try {
          console.clear();
        } catch {
          // Ignore
        }
      }
    }, 4000);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('dragstart', handleDragStart, { capture: true });
      clearInterval(timer);
    };
  }, []);

  return null;
}
