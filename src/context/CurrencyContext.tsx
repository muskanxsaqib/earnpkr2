// ==============================================================================
// 🌐 FILE: src/context/CurrencyContext.tsx
// Universal Multi-Currency Context Provider (PKR, USD, INR, USDT)
// Syncs with Admin Global Exchange Rates in Supabase + User Browser Preference
// ==============================================================================

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  CurrencyCode,
  CurrencyConfig,
  ExchangeRatesState,
  SUPPORTED_CURRENCIES,
  DEFAULT_EXCHANGE_RATES,
  formatCurrency,
  convertFromPkr,
  convertToPkr,
  FormatCurrencyOptions,
} from '../lib/currency';
import { supabase } from '../lib/supabase';
import { soundFx } from '../utils/audioSynth';

interface CurrencyContextType {
  currency: CurrencyCode;
  activeCurrencyMeta: CurrencyConfig;
  rates: ExchangeRatesState;
  platformDefaultCurrency: CurrencyCode;
  allowUserSwitch: boolean;
  setCurrency: (code: CurrencyCode) => void;
  format: (amountInPkr: number | string | null | undefined, options?: FormatCurrencyOptions) => string;
  convert: (amountInPkr: number | string | null | undefined, targetCurrency?: CurrencyCode) => number;
  toPkr: (amountInCurrency: number | string | null | undefined, fromCurrency?: CurrencyCode) => number;
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Deterministic SSR-safe initial state (Always starts with PKR to prevent hydration mismatch)
  const [currency, setCurrencyState] = useState<CurrencyCode>('PKR');
  const [rates, setRates] = useState<ExchangeRatesState>(DEFAULT_EXCHANGE_RATES);
  const [platformDefaultCurrency, setPlatformDefaultCurrency] = useState<CurrencyCode>('PKR');
  const [allowUserSwitch, setAllowUserSwitch] = useState<boolean>(true);

  // Load preferences from localStorage and Supabase app_settings after mount
  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      // 1. Instant optimistic check from localStorage (0ms immediate render)
      let userSavedCurrency: CurrencyCode | null = null;
      try {
        const saved = localStorage.getItem('app_user_currency') as CurrencyCode;
        if (saved && SUPPORTED_CURRENCIES[saved]) {
          userSavedCurrency = saved;
          setCurrencyState(saved);
        }
      } catch (e) {}

      // 2. Load latest exchange rates & settings from Supabase
      try {
        const { data: settings } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', ['currency_rates_json', 'default_platform_currency', 'allow_user_currency_switch']);

        if (settings && isMounted) {
          const map: Record<string, string> = {};
          settings.forEach((s) => {
            map[s.setting_key] = s.setting_value;
          });

          // Parse rates
          if (map['currency_rates_json']) {
            try {
              const parsed = JSON.parse(map['currency_rates_json']);
              const mergedRates: ExchangeRatesState = { ...DEFAULT_EXCHANGE_RATES };
              if (parsed.USD?.rateInPkr) mergedRates.USD = Number(parsed.USD.rateInPkr);
              else if (typeof parsed.USD === 'number') mergedRates.USD = parsed.USD;

              if (parsed.INR?.rateInPkr) mergedRates.INR = Number(parsed.INR.rateInPkr);
              else if (typeof parsed.INR === 'number') mergedRates.INR = parsed.INR;

              if (parsed.USDT?.rateInPkr) mergedRates.USDT = Number(parsed.USDT.rateInPkr);
              else if (typeof parsed.USDT === 'number') mergedRates.USDT = parsed.USDT;

              setRates(mergedRates);
            } catch (e) {}
          }

          // Check if admin allows user switcher
          const canSwitch = map['allow_user_currency_switch'] !== 'false';
          setAllowUserSwitch(canSwitch);

          // Admin default currency
          const adminDefault = (map['default_platform_currency'] || 'PKR') as CurrencyCode;
          if (SUPPORTED_CURRENCIES[adminDefault]) {
            setPlatformDefaultCurrency(adminDefault);
          }

          // Set active currency
          if (userSavedCurrency && canSwitch) {
            setCurrencyState(userSavedCurrency);
          } else if (adminDefault && SUPPORTED_CURRENCIES[adminDefault]) {
            setCurrencyState(adminDefault);
          }
        }
      } catch (err) {
        console.warn('Currency settings fetch failed, using defaults', err);
      }
    };

    loadSettings();

    const handleStorageChange = () => {
      try {
        const updated = localStorage.getItem('app_user_currency') as CurrencyCode;
        if (updated && SUPPORTED_CURRENCIES[updated]) {
          setCurrencyState(updated);
        }
      } catch (e) {}
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('app-currency-changed', handleStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('app-currency-changed', handleStorageChange);
    };
  }, []);

  const handleSetCurrency = (code: CurrencyCode) => {
    if (!SUPPORTED_CURRENCIES[code]) return;
    setCurrencyState(code);
    try {
      localStorage.setItem('app_user_currency', code);
      window.dispatchEvent(new Event('app-currency-changed'));
    } catch (e) {}

    // Tactile audio feedback
    try {
      soundFx.playPop(560);
    } catch (e) {}
  };

  const activeCurrencyMeta = useMemo(() => {
    return SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.PKR;
  }, [currency]);

  const format = useMemo(() => {
    return (amountInPkr: number | string | null | undefined, options?: FormatCurrencyOptions) => {
      return formatCurrency(amountInPkr, currency, rates, options);
    };
  }, [currency, rates]);

  const convert = useMemo(() => {
    return (amountInPkr: number | string | null | undefined, targetCurrency?: CurrencyCode) => {
      return convertFromPkr(amountInPkr, targetCurrency || currency, rates);
    };
  }, [currency, rates]);

  const toPkr = useMemo(() => {
    return (amountInCurrency: number | string | null | undefined, fromCurrency?: CurrencyCode) => {
      return convertToPkr(amountInCurrency, fromCurrency || currency, rates);
    };
  }, [currency, rates]);

  const refreshRates = async () => {
    const { data: setting } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'currency_rates_json')
      .maybeSingle();

    if (setting?.setting_value) {
      try {
        const parsed = JSON.parse(setting.setting_value);
        const mergedRates: ExchangeRatesState = { ...DEFAULT_EXCHANGE_RATES };
        if (parsed.USD?.rateInPkr) mergedRates.USD = Number(parsed.USD.rateInPkr);
        else if (typeof parsed.USD === 'number') mergedRates.USD = parsed.USD;

        if (parsed.INR?.rateInPkr) mergedRates.INR = Number(parsed.INR.rateInPkr);
        else if (typeof parsed.INR === 'number') mergedRates.INR = parsed.INR;

        if (parsed.USDT?.rateInPkr) mergedRates.USDT = Number(parsed.USDT.rateInPkr);
        else if (typeof parsed.USDT === 'number') mergedRates.USDT = parsed.USDT;

        setRates(mergedRates);
      } catch (e) {}
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        activeCurrencyMeta,
        rates,
        platformDefaultCurrency,
        allowUserSwitch,
        setCurrency: handleSetCurrency,
        format,
        convert,
        toPkr,
        refreshRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Graceful fallback for non-wrapped components or SSR
    return {
      currency: 'PKR',
      activeCurrencyMeta: SUPPORTED_CURRENCIES.PKR,
      rates: DEFAULT_EXCHANGE_RATES,
      platformDefaultCurrency: 'PKR',
      allowUserSwitch: true,
      setCurrency: () => {},
      format: (amount, options) => formatCurrency(amount, 'PKR', DEFAULT_EXCHANGE_RATES, options),
      convert: (amount) => Number(amount) || 0,
      toPkr: (amount) => Number(amount) || 0,
      refreshRates: async () => {},
    };
  }
  return context;
};
