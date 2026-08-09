import type { CurrencyConversionResult } from '../models/currencyConversionResult.js';

export interface CurrencyConverter {
  toUsdCents(amount: number, currency: string): CurrencyConversionResult;
}
