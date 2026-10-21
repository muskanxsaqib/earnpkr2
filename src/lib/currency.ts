// ==============================================================================
// 🌐 MULTI-CURRENCY ENGINE FOR TASK EARN HUB
// Base Accounting Currency is always PKR (Strict Zero-Loss Guarantee)
// Supports Real-Time Dynamic Conversion to USD ($), INR (₹), and USDT (₮)
// ==============================================================================

export type CurrencyCode = 'PKR' | 'USD' | 'INR' | 'USDT';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  decimals: number;
  rateInPkr: number; // How many PKR equals 1 unit of this currency (e.g. 1 USD = 280 PKR)
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  PKR: {
    code: 'PKR',
    symbol: 'Rs.',
    name: 'Pakistani Rupee',
    flag: '🇵🇰',
    decimals: 0,
    rateInPkr: 1,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    flag: '🇺🇸',
    decimals: 2,
    rateInPkr: 280,
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    flag: '🇮🇳',
    decimals: 1,
    rateInPkr: 3.35,
  },
  USDT: {
    code: 'USDT',
    symbol: '₮',
    name: 'Tether USD',
    flag: '🌐',
    decimals: 2,
    rateInPkr: 280,
  },
};

export interface ExchangeRatesState {
  USD: number;
  INR: number;
  USDT: number;
  [key: string]: number;
}

export const DEFAULT_EXCHANGE_RATES: ExchangeRatesState = {
  USD: 280,
  INR: 3.35,
  USDT: 280,
};

/**
 * Converts a base PKR amount to the targeted currency
 */
export function convertFromPkr(
  amountInPkr: number | string | null | undefined,
  targetCurrency: CurrencyCode,
  rates: ExchangeRatesState = DEFAULT_EXCHANGE_RATES
): number {
  const numericAmount = Number(amountInPkr) || 0;
  if (targetCurrency === 'PKR') return numericAmount;

  const rate = Number(rates[targetCurrency]) || Number(SUPPORTED_CURRENCIES[targetCurrency]?.rateInPkr) || 1;
  if (rate <= 0) return numericAmount;

  return numericAmount / rate;
}

/**
 * Converts an external currency amount into the base PKR currency
 */
export function convertToPkr(
  amountInCurrency: number | string | null | undefined,
  fromCurrency: CurrencyCode,
  rates: ExchangeRatesState = DEFAULT_EXCHANGE_RATES
): number {
  const numericAmount = Number(amountInCurrency) || 0;
  if (fromCurrency === 'PKR') return numericAmount;

  const rate = Number(rates[fromCurrency]) || Number(SUPPORTED_CURRENCIES[fromCurrency]?.rateInPkr) || 1;
  return numericAmount * rate;
}

export interface FormatCurrencyOptions {
  showCode?: boolean; // Append "PKR", "USD", etc.
  showFlag?: boolean; // Prepend flag emoji 🇵🇰, 🇺🇸, etc.
  customDecimals?: number;
  compact?: boolean;
}

/**
 * Universal Currency Formatter
 * Takes a base PKR amount and returns a beautifully formatted localized currency string
 */
export function formatCurrency(
  amountInPkr: number | string | null | undefined,
  currency: CurrencyCode = 'PKR',
  rates: ExchangeRatesState = DEFAULT_EXCHANGE_RATES,
  options: FormatCurrencyOptions = {}
): string {
  const config = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES.PKR;
  const converted = convertFromPkr(amountInPkr, currency, rates);

  const decimals = options.customDecimals !== undefined ? options.customDecimals : config.decimals;

  // Format with commas and exact decimals
  const formattedNumber = converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  let result = `${config.symbol} ${formattedNumber}`;

  if (currency === 'PKR') {
    result = `Rs. ${formattedNumber}`;
  }

  if (options.showCode) {
    result = `${result} ${config.code}`;
  }

  if (options.showFlag) {
    result = `${config.flag} ${result}`;
  }

  return result;
}

/**
 * Parses Exchange Rates JSON with robust fallback to official defaults
 */
export function parseExchangeRatesJson(jsonStr: string | null | undefined): ExchangeRatesState {
  if (!jsonStr) return { ...DEFAULT_EXCHANGE_RATES };
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      USD: Number(parsed.USD) > 0 ? Number(parsed.USD) : DEFAULT_EXCHANGE_RATES.USD,
      INR: Number(parsed.INR) > 0 ? Number(parsed.INR) : DEFAULT_EXCHANGE_RATES.INR,
      USDT: Number(parsed.USDT) > 0 ? Number(parsed.USDT) : DEFAULT_EXCHANGE_RATES.USDT,
    };
  } catch (e) {
    return { ...DEFAULT_EXCHANGE_RATES };
  }
}
