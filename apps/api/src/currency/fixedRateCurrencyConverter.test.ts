import { describe, expect, it } from 'vitest';

import { FixedRateCurrencyConverter } from './fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from './rates.js';

const converter = new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT);

describe('FixedRateCurrencyConverter', () => {
  it.each([
    { amount: 100_000, currency: 'USD', expectedUsdCents: 10_000_000 },
    { amount: 20_000, currency: 'CAD', expectedUsdCents: 1_480_000 },
    { amount: 85_000, currency: 'GBP', expectedUsdCents: 10_625_000 },
    { amount: 78_000, currency: 'EUR', expectedUsdCents: 8_424_000 },
    { amount: 58, currency: 'EUR', expectedUsdCents: 6_264 },
  ])(
    'converts $amount $currency to $expectedUsdCents USD cents',
    ({ amount, currency, expectedUsdCents }) => {
      expect(converter.toUsdCents(amount, currency)).toEqual({
        ok: true,
        usdCents: expectedUsdCents,
      });
    },
  );

  it.each([
    { amount: 1.234, expectedUsdCents: 123 },
    { amount: 1.235, expectedUsdCents: 124 },
  ])('rounds $amount USD to $expectedUsdCents integer cents', ({ amount, expectedUsdCents }) => {
    expect(converter.toUsdCents(amount, 'USD')).toEqual({
      ok: true,
      usdCents: expectedUsdCents,
    });
  });

  it.each(Object.entries(USD_CENTS_PER_CURRENCY_UNIT))(
    'converts the largest safe whole-unit %s amount at its configured rate',
    (currency, usdCentsPerCurrencyUnit) => {
      const amount = Math.floor(Number.MAX_SAFE_INTEGER / usdCentsPerCurrencyUnit);
      const usdCents = Math.round(amount * usdCentsPerCurrencyUnit);

      expect(Number.isSafeInteger(usdCents)).toBe(true);

      expect(converter.toUsdCents(amount, currency)).toEqual({
        ok: true,
        usdCents,
      });
    },
  );

  it.each(Object.entries(USD_CENTS_PER_CURRENCY_UNIT))(
    'rejects the first unsafe whole-unit %s amount at its configured rate',
    (currency, usdCentsPerCurrencyUnit) => {
      const amount = Math.floor(Number.MAX_SAFE_INTEGER / usdCentsPerCurrencyUnit) + 1;
      const usdCents = Math.round(amount * usdCentsPerCurrencyUnit);

      expect(Number.isSafeInteger(usdCents)).toBe(false);

      expect(converter.toUsdCents(amount, currency)).toEqual({
        ok: false,
        reason: 'amount-out-of-range',
        currency,
      });
    },
  );

  it('returns an explicit range failure when conversion produces Infinity', () => {
    expect(converter.toUsdCents(Number.MAX_VALUE, 'USD')).toEqual({
      ok: false,
      reason: 'amount-out-of-range',
      currency: 'USD',
    });
  });

  it.each(['XYZ', 'usd', ' USD '])(
    'returns an explicit failure without normalizing unsupported currency %j',
    (currency) => {
      expect(converter.toUsdCents(100, currency)).toEqual({
        ok: false,
        reason: 'unsupported-currency',
        currency,
      });
    },
  );

  it('does not confuse an unsupported currency with an out-of-range amount', () => {
    expect(converter.toUsdCents(Number.MAX_VALUE, 'XYZ')).toEqual({
      ok: false,
      reason: 'unsupported-currency',
      currency: 'XYZ',
    });
  });

  it('uses the injected rates', () => {
    const customRateConverter = new FixedRateCurrencyConverter({ TEST: 42 });

    expect(customRateConverter.toUsdCents(10, 'TEST')).toEqual({
      ok: true,
      usdCents: 420,
    });
  });
});
