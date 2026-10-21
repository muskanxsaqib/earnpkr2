// ==============================================================================
// 🌐 FILE: src/components/CurrencySwitcherModal.tsx
// Tactile Interactive Currency Selector & Switcher Modal (PKR, USD, INR, USDT)
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Globe, X, ChevronDown, Sparkles } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { CurrencyCode, SUPPORTED_CURRENCIES } from '../lib/currency';
import { useTactileTheme } from '../context/TactileThemeContext';

export const CurrencySwitcherTrigger: React.FC<{ 
  className?: string;
  showName?: boolean;
}> = ({ className = '', showName = false }) => {
  const { currency, activeCurrencyMeta, allowUserSwitch } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const { theme, currentThemeMeta } = useTactileTheme();
  const isDarkTheme = Boolean(currentThemeMeta?.isDark || theme === 'neo-gray-dark' || theme === 'neo-blue-dark');

  if (!allowUserSwitch) return null;

  return (
    <>
      <button
        type="button"
        data-testid="currency-switcher-trigger"
        onClick={() => setIsOpen(true)}
        title="Switch Currency (PKR, USD, INR, USDT)"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border font-black text-xs transition-all duration-150 cursor-pointer active:scale-95 ${
          className ||
          (isDarkTheme
            ? 'bg-slate-900/90 hover:bg-slate-800 text-slate-100 border-white/15 shadow-xs'
            : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/90 shadow-xs')
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0">{activeCurrencyMeta.flag}</span>
          <span className="tracking-wide shrink-0">{activeCurrencyMeta.code}</span>
          {showName && (
            <span className="text-[11px] font-normal opacity-70 truncate">({activeCurrencyMeta.name})</span>
          )}
        </div>
        <ChevronDown size={13} className="opacity-60 shrink-0 ml-auto" />
      </button>

      {isOpen && <CurrencySwitcherModal isOpen={isOpen} onClose={() => setIsOpen(false)} />}
    </>
  );
};

export const CurrencySwitcherModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { currency, setCurrency, rates } = useCurrency();
  const { theme, currentThemeMeta, playPop, playSuccess } = useTactileTheme();
  const isDarkTheme = Boolean(currentThemeMeta?.isDark || theme === 'neo-gray-dark' || theme === 'neo-blue-dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  const currencyList: CurrencyCode[] = ['PKR', 'USD', 'INR', 'USDT'];

  const handleSelect = (code: CurrencyCode) => {
    playSuccess();
    setCurrency(code);
    onClose();
  };

  const modalBody = (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="currency-modal"
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playPop(420);
          onClose();
        }
      }}
    >
      <div
        className={`w-full max-w-sm rounded-3xl p-5 border shadow-2xl transition-all space-y-4 animate-in fade-in zoom-in-95 duration-150 ${
          isDarkTheme ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight leading-none">Select Currency</h3>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">Live conversion across all plans & wallet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playPop(420);
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Currency Options Grid */}
        <div className="space-y-2.5 pt-1">
          {currencyList.map((code) => {
            const cfg = SUPPORTED_CURRENCIES[code];
            const isSelected = currency === code;
            const rateInPkr = code === 'PKR' ? 1 : Number(rates[code]) || cfg.rateInPkr;

            // Sample Rs. 1000 calculation preview
            let samplePreview = 'Rs. 1,000';
            if (code === 'USD') {
              samplePreview = `$ ${(1000 / rateInPkr).toFixed(2)}`;
            } else if (code === 'INR') {
              samplePreview = `₹ ${(1000 / rateInPkr).toFixed(1)}`;
            } else if (code === 'USDT') {
              samplePreview = `₮ ${(1000 / rateInPkr).toFixed(2)}`;
            }

            return (
              <button
                key={code}
                data-currency-code={code}
                type="button"
                onClick={() => handleSelect(code)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                    : isDarkTheme
                    ? 'border-slate-800 bg-slate-800/60 hover:bg-slate-800 hover:border-slate-700'
                    : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl drop-shadow-xs">{cfg.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm tracking-wide">{cfg.name}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300">
                        {cfg.code}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                      {code === 'PKR' ? 'Base Platform Currency' : `1 ${code} ≈ ${rateInPkr} PKR`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    {samplePreview}
                  </span>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-700 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="pt-1 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1">
            <Sparkles size={11} className="text-amber-500" />
            Zero-Loss Real-time Exchange Rates
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modalBody, document.body);
};
