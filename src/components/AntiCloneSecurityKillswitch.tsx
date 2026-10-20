'use client';

import React, { useEffect, useRef } from 'react';

interface Props {
  authorizedDomains?: string[];
  disableKillswitch?: boolean;
}

/**
 * 🔒 AntiCloneSecurityKillswitch
 * Adapted from Saqib Visuals Hub Security Vault
 * 
 * Features:
 * 1. Digital DRM Domain Authorization verification
 * 2. Blocks unlicensed offline mirror copies (file:// protocol)
 * 3. Kills fetch / XHR if running on an unauthorized stolen domain
 * 4. Displays encrypted tamper lockdown screen with auto-redirect
 * 5. MutationObserver anti-tamper security kernel guard
 */
export function AntiCloneSecurityKillswitch({
  authorizedDomains = [],
  disableKillswitch = false,
}: Props) {
  const guardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Master killswitch bypass for local or test deployments
    if (
      disableKillswitch ||
      process.env.NEXT_PUBLIC_DISABLE_KILLSWITCH === 'true'
    ) {
      return;
    }

    // Read additional allowed domains from environment variables
    const envAllowed = (process.env.NEXT_PUBLIC_ALLOWED_DOMAINS || '')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    if (envAppUrl) {
      try {
        const parsed = new URL(envAppUrl.startsWith('http') ? envAppUrl : `https://${envAppUrl}`);
        envAllowed.push(parsed.hostname.toLowerCase());
      } catch {}
    }

    // Base allowed domains
    const baseAllowed = [
      'localhost',
      '127.0.0.1',
      'vercel.app',
      '0.0.0.0',
    ];

    const allAllowed = [
      ...baseAllowed,
      ...envAllowed,
      ...authorizedDomains.map((d) => d.toLowerCase().trim()),
    ];

    const currentHost = window.location.hostname.toLowerCase();
    const currentProtocol = window.location.protocol;
    const isFileProtocol = currentProtocol === 'file:';

    const verifyAndEnforce = async () => {
      let allowed = [...allAllowed];

      // Read database-whitelisted domains from /api/branding
      try {
        const res = await fetch('/api/branding');
        const json = await res.json();
        const dbDomains = String(json?.branding?.authorized_domains || '')
          .split(',')
          .map((d: string) => d.trim().toLowerCase())
          .filter(Boolean);
        allowed = [...allowed, ...dbDomains];
      } catch {
        // fallback to base allowed
      }

      // Verify domain authorization
      const isAuthorized =
        !isFileProtocol &&
        allowed.some((domain) => {
          if (!domain) return false;
          return currentHost === domain || currentHost.endsWith(`.${domain}`);
        });

      // ==================== UNLICENSED CLONE DETECTED: EXECUTE KILLSWITCH ====================
      if (!isAuthorized && currentHost) {
        console.error('🛑 KILLSWITCH ACTIVATED: Unauthorized mirror deployment detected on host:', currentHost);

        // 1. Break client-side networking
        try {
          window.fetch = () => Promise.reject(new Error('Killswitch: Unauthorized Mirror Domain'));
          // @ts-ignore
          window.XMLHttpRequest = function () {
            this.open = () => {};
            this.send = () => {};
          };
        } catch {}

        // 2. Poison and Replace Document Content
        const executeDestruction = () => {
          document.documentElement.style.backgroundColor = '#070a12';
          document.documentElement.style.overflow = 'hidden';
          document.body.innerHTML = `
            <div style="position:fixed;inset:0;background:#060810;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;z-index:9999999;padding:24px;text-align:center;">
              <div style="background:rgba(239,68,68,0.12);border:2px solid #ef4444;border-radius:24px;padding:40px 32px;max-width:540px;box-shadow:0 25px 60px rgba(239,68,68,0.3);backdrop-filter:blur(20px);">
                <div style="font-size:48px;margin-bottom:12px;">🛑</div>
                <div style="display:inline-block;background:rgba(239,68,68,0.2);color:#fca5a5;font-size:11px;font-weight:900;letter-spacing:1px;padding:6px 16px;border-radius:999px;margin-bottom:16px;border:1px solid rgba(239,68,68,0.4);">
                  UNLICENSED CLONE / MIRROR DETECTED
                </div>
                <h1 style="color:#fff;font-size:24px;font-weight:900;margin:0 0 12px;line-height:1.3;">
                  Access Denied: Stolen Code Lock Active
                </h1>
                <p style="color:#94a3b8;font-size:13px;line-height:1.6;margin:0 0 24px;">
                  This platform is digitally signed and owned exclusively by <b>Task Earn Hub & Saqib</b>. 
                  Unauthorized cloning, copying, or re-hosting on <code>${isFileProtocol ? 'Local Disk / Saved HTML' : currentHost}</code> is prohibited by digital DRM policy.
                </p>
                <div style="padding:12px;background:rgba(0,0,0,0.5);border-radius:12px;font-size:11px;color:#fca5a5;font-weight:bold;margin-bottom:20px;">
                  ⚠️ Redirecting to Official Verified Hub in 3 seconds...
                </div>
                <a href="https://mrsaqib242.vercel.app" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;font-size:12px;font-weight:900;padding:12px 24px;border-radius:12px;box-shadow:0 8px 20px rgba(239,68,68,0.4);">
                  Go to Official Verified Website ➔
                </a>
              </div>
            </div>
          `;

          setTimeout(() => {
            try {
              window.location.replace('https://mrsaqib242.vercel.app');
            } catch {
              window.location.href = 'https://mrsaqib242.vercel.app';
            }
          }, 3000);
        };

        if (document.body) {
          executeDestruction();
        } else {
          window.addEventListener('DOMContentLoaded', executeDestruction);
        }
      }
    };

    verifyAndEnforce();

    // ==================== MUTATION OBSERVER ANTI-TAMPER ====================
    const guardNode = guardRef.current;
    if (guardNode && typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          mutation.removedNodes.forEach((node) => {
            if (node === guardNode) {
              console.warn('⚠️ Anti-tamper violation: Security element removal detected.');
              document.body.innerHTML = '';
              window.location.reload();
            }
          });
        }
      });

      if (guardNode.parentNode) {
        observer.observe(guardNode.parentNode, { childList: true });
      }

      return () => {
        observer.disconnect();
      };
    }
  }, [authorizedDomains, disableKillswitch]);

  return (
    <div
      ref={guardRef}
      id="task-earn-hub-security-kernel-guard"
      data-security-signature="sha512-task-earn-hub-drm-protected"
      style={{ display: 'none' }}
      aria-hidden="true"
    />
  );
}

export default AntiCloneSecurityKillswitch;
