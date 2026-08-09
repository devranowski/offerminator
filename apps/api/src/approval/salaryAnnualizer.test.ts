import { describe, expect, it } from 'vitest';

import { FixedRateCurrencyConverter } from '../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../currency/rates.js';
import { annualizeSalaryUsdCents, HOURS_PER_YEAR } from './salaryAnnualizer.js';

const converter = new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT);
const largestSafeHourlyUsdCents = Math.floor(Number.MAX_SAFE_INTEGER / HOURS_PER_YEAR);

describe('annualizeSalaryUsdCents', () => {
  it('keeps a safe annual amount unchanged', () => {
    expect(annualizeSalaryUsdCents(12_000_000, 'annual')).toEqual({
      ok: true,
      annualizedSalaryUsdCents: 12_000_000,
    });
  });

  it('annualizes 60 USD per hour as 124,800 USD', () => {
    expect(annualizeSalaryUsdCents(6_000, 'hourly')).toEqual({
      ok: true,
      annualizedSalaryUsdCents: 12_480_000,
    });
  });

  it('accepts the largest hourly cent amount safe after annualization', () => {
    expect(annualizeSalaryUsdCents(largestSafeHourlyUsdCents, 'hourly')).toEqual({
      ok: true,
      annualizedSalaryUsdCents: largestSafeHourlyUsdCents * HOURS_PER_YEAR,
    });
  });

  it('rejects the first hourly cent amount unsafe after annualization', () => {
    expect(annualizeSalaryUsdCents(largestSafeHourlyUsdCents + 1, 'hourly')).toEqual({
      ok: false,
      reason: 'amount-out-of-range',
    });
  });

  it.each(Object.entries(USD_CENTS_PER_CURRENCY_UNIT))(
    'rejects a safe %s conversion that becomes unsafe after annualization',
    (currency, usdCentsPerCurrencyUnit) => {
      const amount = Math.floor(largestSafeHourlyUsdCents / usdCentsPerCurrencyUnit) + 1;
      const conversion = converter.toUsdCents(amount, currency);

      if (!conversion.ok) {
        throw new Error(`Expected ${amount} ${currency} to convert safely.`);
      }

      expect(Number.isSafeInteger(conversion.usdCents)).toBe(true);
      expect(annualizeSalaryUsdCents(conversion.usdCents, 'hourly')).toEqual({
        ok: false,
        reason: 'amount-out-of-range',
      });
    },
  );
});
