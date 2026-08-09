import type { CurrencyConversionResult } from '../models/currencyConversionResult.js';
import type { CurrencyConverter } from './currencyConverter.js';
import type { CurrencyRates } from './rates.js';

export class FixedRateCurrencyConverter implements CurrencyConverter {
  constructor(private readonly rates: CurrencyRates) {}

  toUsdCents(amount: number, currency: string): CurrencyConversionResult {
    const usdCentsPerCurrencyUnit = this.rates[currency];

    if (usdCentsPerCurrencyUnit === undefined) {
      return {
        ok: false,
        reason: 'unsupported-currency',
        currency,
      };
    }

    const usdCents = Math.round(amount * usdCentsPerCurrencyUnit);

    if (!Number.isSafeInteger(usdCents)) {
      return {
        ok: false,
        reason: 'amount-out-of-range',
        currency,
      };
    }

    return { ok: true, usdCents };
  }
}
