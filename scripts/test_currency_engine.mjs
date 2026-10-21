import assert from 'node:assert';
import {
  SUPPORTED_CURRENCIES,
  DEFAULT_EXCHANGE_RATES,
  convertFromPkr,
  convertToPkr,
  formatCurrency,
  parseExchangeRatesJson,
} from '../src/lib/currency.ts';

console.log('====================================================');
console.log('🌐 TESTING MULTI-CURRENCY CONVERSION & FORMAT ENGINE');
console.log('====================================================');

// Test 1: PKR Identity
const pkrFormatted = formatCurrency(1000, 'PKR');
assert.strictEqual(pkrFormatted, 'Rs. 1,000');
console.log('✅ [PASS] PKR Formatting:', pkrFormatted);

// Test 2: USD Conversion (Default 280 PKR = 1 USD)
// 1000 / 280 = 3.5714... -> $ 3.57
const usdFormatted = formatCurrency(1000, 'USD', DEFAULT_EXCHANGE_RATES);
assert.strictEqual(usdFormatted, '$ 3.57');
console.log('✅ [PASS] USD Conversion (Rs. 1,000 @ 280):', usdFormatted);

// Test 3: INR Conversion (Default 3.35 PKR = 1 INR)
// 1000 / 3.35 = 298.507... -> ₹ 298.5
const inrFormatted = formatCurrency(1000, 'INR', DEFAULT_EXCHANGE_RATES);
assert.strictEqual(inrFormatted, '₹ 298.5');
console.log('✅ [PASS] INR Conversion (Rs. 1,000 @ 3.35):', inrFormatted);

// Test 4: USDT Conversion (Default 280 PKR = 1 USDT)
const usdtFormatted = formatCurrency(1000, 'USDT', DEFAULT_EXCHANGE_RATES);
assert.strictEqual(usdtFormatted, '₮ 3.57');
console.log('✅ [PASS] USDT Conversion (Rs. 1,000 @ 280):', usdtFormatted);

// Test 5: Custom Rates test
const customRates = { USD: 300, INR: 4.0, USDT: 300 };
const usdCustom = formatCurrency(3000, 'USD', customRates);
assert.strictEqual(usdCustom, '$ 10.00');
const inrCustom = formatCurrency(400, 'INR', customRates);
assert.strictEqual(inrCustom, '₹ 100.0');
console.log('✅ [PASS] Custom Rates USD:', usdCustom, '| INR:', inrCustom);

// Test 6: Zero & Negative Edge Cases
const zeroPkr = formatCurrency(0, 'USD');
assert.strictEqual(zeroPkr, '$ 0.00');
const nullVal = formatCurrency(null, 'PKR');
assert.strictEqual(nullVal, 'Rs. 0');
console.log('✅ [PASS] Zero and Null Edge Cases handled cleanly');

// Test 7: JSON Parsing with corrupted fallback
const parsedEmpty = parseExchangeRatesJson(null);
assert.strictEqual(parsedEmpty.USD, 280);
const parsedCorrupt = parseExchangeRatesJson('{ invalid json');
assert.strictEqual(parsedCorrupt.INR, 3.35);
const parsedCustom = parseExchangeRatesJson('{"USD":295.5,"INR":3.5,"USDT":295.5}');
assert.strictEqual(parsedCustom.USD, 295.5);
assert.strictEqual(parsedCustom.INR, 3.5);
console.log('✅ [PASS] JSON Parsing Fallback & Custom values');

// Test 8: Convert back to PKR
const backToPkr = convertToPkr(10, 'USD', { USD: 280, INR: 3.35, USDT: 280 });
assert.strictEqual(backToPkr, 2800);
console.log('✅ [PASS] Convert back to PKR (10 USD = 2800 PKR)');

console.log('====================================================');
console.log('🎉 ALL 8 CURRENCY ENGINE TESTS PASSED PERFECTLY!');
console.log('====================================================');
