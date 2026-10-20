/**
 * Task Earn Hub - Client-Side Protection & System Security Engine
 * Restricts Developer Tools, F12 inspect shortcuts, Right-Clicks, View-Source, and keyboard captures.
 */

// Helper to display safe, non-intrusive warning banners instead of window.alert which is restricted in iframes
const showSecurityWarning = (message: string) => {
  // Create or retrieve security toast container
  let container = document.getElementById('security-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'security-toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.left = '50%';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '999999';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.style.background = 'rgba(15, 23, 42, 0.95)';
  toast.style.color = '#F8FAFC';
  toast.style.border = '1px solid rgba(239, 68, 68, 0.2)';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '12px';
  toast.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)';
  toast.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  toast.style.fontSize = '13px';
  toast.style.fontWeight = '600';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '10px';
  toast.style.marginTop = '10px';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(10px)';
  toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Icon and text
  toast.innerHTML = `
    <span style="color: #EF4444; font-size: 16px;">⚠️</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Trigger entrance transition
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  // Fade out and remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      toast.remove();
      if (container && container.childElementCount === 0) {
        container.remove();
      }
    }, 300);
  }, 2500);
};

export function initSecurity() {
  if (typeof window === 'undefined') return;

  // 1. Disable Right Click (Context Menu)
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showSecurityWarning('Right-click menu is disabled for security reasons.');
  });

  // 2. Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S, Ctrl+P, etc.
  document.addEventListener('keydown', (e) => {
    // Check key codes and key string representation
    const key = e.key || '';
    const code = e.code || '';
    const ctrlOrMeta = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    // F12 key
    if (key === 'F12' || code === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('Developer options (F12) are restricted.');
      return false;
    }

    // Ctrl+Shift+I (or Cmd+Opt+I) -> Inspect Element
    if (ctrlOrMeta && shift && (key.toLowerCase() === 'i' || code === 'KeyI')) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('Security System: Inspection tools are locked.');
      return false;
    }

    // Ctrl+Shift+J (or Cmd+Opt+J) -> Console
    if (ctrlOrMeta && shift && (key.toLowerCase() === 'j' || code === 'KeyJ')) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('Security System: Console access is disabled.');
      return false;
    }

    // Ctrl+Shift+C (or Cmd+Opt+C) -> Element Picker
    if (ctrlOrMeta && shift && (key.toLowerCase() === 'c' || code === 'KeyC')) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('Security System: Element inspector is restricted.');
      return false;
    }

    // Ctrl+U (or Cmd+U) -> View Source code
    if (ctrlOrMeta && (key.toLowerCase() === 'u' || code === 'KeyU')) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('Security System: View-Source code is disabled.');
      return false;
    }

    // Ctrl+S (or Cmd+S) -> Save Page
    if (ctrlOrMeta && (key.toLowerCase() === 's' || code === 'KeyS')) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('Security System: Page saving is restricted.');
      return false;
    }

    // Ctrl+P (or Cmd+P) -> Print Page
    if (ctrlOrMeta && (key.toLowerCase() === 'p' || code === 'KeyP')) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('Security System: Printing or exporting is restricted.');
      return false;
    }

    // Cmd+Opt+I on Mac (Alt + Command + I)
    if (alt && ctrlOrMeta && (key.toLowerCase() === 'i' || code === 'KeyI')) {
      e.preventDefault();
      e.stopPropagation();
      showSecurityWarning('Security System: Inspection tools are locked.');
      return false;
    }
  }, true);

  // 3. Prevent dragging of sensitive layout elements
  document.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'IMG' || target.classList.contains('no-drag'))) {
      e.preventDefault();
    }
  });

  // 4. Periodically clear console warnings & messages in production to prevent leakage
  if (process.env.NODE_ENV === 'production') {
    // Disable logging APIs to keep console output completely blank
    const noop = () => {};
    console.log = noop;
    console.info = noop;
    console.warn = noop;
    console.debug = noop;
    console.error = noop;

    setInterval(() => {
      try {
        console.clear();
      } catch (err) {}
    }, 2000);
  }

  // 5. Sophisticated Developer Tools Detection using debugger checks
  let isDevToolsOpen = false;
  const devtoolsChecker = () => {
    const start = performance.now();
    // Debugger statement triggers a pause only when developer tools are active
    // We run it within a safe closure to isolate variables
    (function() {
      // Simple debugger pulse
      const dummy = new Function('debugger');
      dummy();
    })();
    const end = performance.now();
    
    // If execution of debugger takes longer than normal, devtools are open
    if (end - start > 100) {
      if (!isDevToolsOpen) {
        isDevToolsOpen = true;
        showSecurityWarning('Developer console has been detected. Please close DevTools to continue.');
      }
      // Force console clearing & continuous blocking behavior
      try {
        console.clear();
      } catch (e) {}
    } else {
      isDevToolsOpen = false;
    }
  };

  // Run the checker on intervals (except in local development environment to avoid blocking developer himself if desired,
  // but since user explicitly requested absolute security to protect project source, we'll run it in production-mode and dev-mode).
  setInterval(devtoolsChecker, 1500);

  // 6. Anti-Iframe/Frame Busting protection (if needed, but our app runs in a frame on AI studio,
  // so we only restrict devtools/inspect, let's keep iframe support fully functional).
  
  // 7. Inject print media style to prevent print screen / pdf export of sensitive data
  const style = document.createElement('style');
  style.innerHTML = `
    @media print {
      body {
        display: none !important;
      }
    }
    .select-none {
      user-select: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
    }
  `;
  document.head.appendChild(style);

  console.log("System Security: Client Protection Protocols initialized successfully.");
}
