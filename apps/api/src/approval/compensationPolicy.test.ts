import { describe, expect, it } from 'vitest';

import { FixedRateCurrencyConverter } from '../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../currency/rates.js';
import { createCountryCode } from '../models/countryCode.js';
import type { CountryCode } from '../models/countryCode.js';
import type { NormalizedJobCandidate } from '../models/normalizedJob.js';
import { DefaultCompensationPolicy, meetsCompensationThreshold } from './compensationPolicy.js';
import type { CompensationThreshold } from './compensationPolicy.js';

const policy = new DefaultCompensationPolicy();
const converter = new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT);
const candidate = createCandidate('US');

describe('DefaultCompensationPolicy', () => {
  it('uses a strict annual threshold above 100,000 USD', () => {
    expect(policy.getThreshold(candidate, 'annual')).toEqual({
      amountUsdCents: 10_000_000,
      operator: 'gt',
    });
  });

  it('uses a strict hourly threshold above 45 USD', () => {
    expect(policy.getThreshold(candidate, 'hourly')).toEqual({
      amountUsdCents: 4_500,
      operator: 'gt',
    });
  });

  it('keeps the default annual threshold for a remote UK job', () => {
    expect(policy.getThreshold(createCandidate('GB'), 'annual')).toEqual({
      amountUsdCents: 10_000_000,
      operator: 'gt',
    });
  });
});

describe('meetsCompensationThreshold', () => {
  it.each([
    ['annual at 100,000 USD', 10_000_000, threshold(10_000_000, 'gt'), false],
    ['annual at 100,000.01 USD', 10_000_001, threshold(10_000_000, 'gt'), true],
    ['hourly at 45 USD', 4_500, threshold(4_500, 'gt'), false],
    ['hourly at 45.01 USD', 4_501, threshold(4_500, 'gt'), true],
    ['future inclusive threshold at its boundary', 9_000_000, threshold(9_000_000, 'gte'), true],
    [
      'future inclusive threshold below its boundary',
      8_999_999,
      threshold(9_000_000, 'gte'),
      false,
    ],
  ] as const)('%s: %s', (_caseName, amountUsdCents, compensationThreshold, expected) => {
    expect(meetsCompensationThreshold(amountUsdCents, compensationThreshold)).toBe(expected);
  });

  it.each([
    ['58 EUR per hour', 58, 'EUR', 'hourly', true],
    ['20,000 CAD annually', 20_000, 'CAD', 'annual', false],
    ['85,000 GBP annually', 85_000, 'GBP', 'annual', true],
  ] as const)(
    'combines conversion and the applicable threshold for %s',
    (_caseName, amount, currency, salaryKind, expected) => {
      const amountUsdCents = requiredUsdCents(amount, currency);
      const compensationThreshold = policy.getThreshold(candidate, salaryKind);

      expect(meetsCompensationThreshold(amountUsdCents, compensationThreshold)).toBe(expected);
    },
  );
});

function threshold(
  amountUsdCents: number,
  operator: CompensationThreshold['operator'],
): CompensationThreshold {
  return { amountUsdCents, operator };
}

function requiredUsdCents(amount: number, currency: string): number {
  const result = converter.toUsdCents(amount, currency);

  if (!result.ok) {
    throw new Error(`Expected ${amount} ${currency} to be converted.`);
  }

  return result.usdCents;
}

function createCandidate(countryValue: 'US' | 'GB'): NormalizedJobCandidate {
  return {
    id: 'test:0',
    sourceId: 'test',
    source: 'test',
    sourceIndex: 0,
    title: 'Test job',
    description: null,
    company: null,
    location: {
      kind: 'remote',
      city: null,
      region: null,
      country: requiredCountryCode(countryValue),
      raw: `Remote, ${countryValue}`,
    },
    salary: {
      kind: 'annual',
      amount: 120_000,
      currency: 'USD',
      source: 'explicit',
    },
    employmentType: 'full-time',
    companyType: 'direct-employer',
    language: 'english',
    postingDate: null,
    warnings: [],
    raw: {},
  };
}

function requiredCountryCode(value: string): CountryCode {
  const country = createCountryCode(value);

  if (country === null) {
    throw new Error(`Expected ${value} to be a valid country code.`);
  }

  return country;
}
