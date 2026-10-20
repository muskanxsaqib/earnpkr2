import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed bottom-24 right-4 left-4 md:left-auto md:right-8 md:w-80 z-[100]"
      >
        <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-500/20 p-4 relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute -top-10 -right-10 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full" />
          
          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400">
              <Smartphone size={24} />
            </div>
            
            <div className="flex-1 pr-4">
              <h3 className="text-white font-bold text-sm leading-tight">Install Earning Hub</h3>
              <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                Install our app for a faster, premium experience and instant access to your earnings.
              </p>
              
              <button
                onClick={handleInstallClick}
                className="mt-3 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black py-2 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <Download size={14} />
                INSTALL NOW
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
