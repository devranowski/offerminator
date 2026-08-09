import { describe, expect, it } from 'vitest';

import { normalizeSalary } from './normalizeSalary.js';

describe('normalizeSalary', () => {
  it.each([150_000, 62.5])('normalizes flat salary %s as annual USD', (amount) => {
    expect(normalizeSalary(amount)).toEqual({
      kind: 'annual',
      amount,
      currency: 'USD',
      source: 'implicit-flat-format',
    });
  });

  it('defaults an object salary without unit to annual', () => {
    expect(normalizeSalary({ value: 145_000, currency: 'USD' })).toEqual({
      kind: 'annual',
      amount: 145_000,
      currency: 'USD',
      source: 'explicit',
    });
  });

  it('defaults an explicitly undefined unit to annual', () => {
    expect(normalizeSalary({ value: 145_000, currency: 'USD', unit: undefined })).toEqual({
      kind: 'annual',
      amount: 145_000,
      currency: 'USD',
      source: 'explicit',
    });
  });

  it('normalizes an explicit annual unit case-insensitively after trimming', () => {
    expect(normalizeSalary({ value: 85_000, currency: ' GBP ', unit: ' Annual ' })).toEqual({
      kind: 'annual',
      amount: 85_000,
      currency: 'GBP',
      source: 'explicit',
    });
  });

  it('normalizes an hourly unit case-insensitively after trimming', () => {
    expect(normalizeSalary({ value: 65, currency: 'USD', unit: ' HOURLY ' })).toEqual({
      kind: 'hourly',
      amount: 65,
      currency: 'USD',
      source: 'explicit',
    });
  });

  it.each(['usd', ' USD ', 'Usd'])('canonicalizes currency %j to uppercase', (currency) => {
    expect(normalizeSalary({ value: 100, currency })).toEqual({
      kind: 'annual',
      amount: 100,
      currency: 'USD',
      source: 'explicit',
    });
  });

  it.each([undefined, null])('maps missing salary %j to reason missing', (value) => {
    expect(normalizeSalary(value)).toEqual({ kind: 'unknown', reason: 'missing', raw: value });
  });

  it.each([
    ['a numeric string', '120000'],
    ['an array', []],
    ['an empty object', {}],
    ['an object without value', { currency: 'USD' }],
    ['an object with a string value', { value: '120000', currency: 'USD' }],
    ['NaN', Number.NaN],
    ['positive infinity', Number.POSITIVE_INFINITY],
    ['zero', 0],
    ['a negative number', -1],
    ['an object with a NaN value', { value: Number.NaN, currency: 'USD' }],
    ['an object with an infinite value', { value: Number.POSITIVE_INFINITY, currency: 'USD' }],
    ['an object with a zero value', { value: 0, currency: 'USD' }],
    ['an object with a negative value', { value: -1, currency: 'USD' }],
  ] satisfies ReadonlyArray<readonly [string, unknown]>)(
    'maps %s to reason invalid-value',
    (_caseName, value) => {
      expect(normalizeSalary(value)).toEqual({
        kind: 'unknown',
        reason: 'invalid-value',
        raw: value,
      });
    },
  );

  it.each([
    { value: 120_000 },
    { value: 120_000, currency: null },
    { value: 120_000, currency: '' },
    { value: 120_000, currency: '   ' },
    { value: 120_000, currency: 123 },
  ])('maps invalid currency in %j to reason missing-currency', (value) => {
    expect(normalizeSalary(value)).toEqual({
      kind: 'unknown',
      reason: 'missing-currency',
      raw: value,
    });
  });

  it.each([
    { value: 120_000, currency: 'USD', unit: 'monthly' },
    { value: 120_000, currency: 'USD', unit: '' },
    { value: 120_000, currency: 'USD', unit: '   ' },
    { value: 120_000, currency: 'USD', unit: null },
    { value: 120_000, currency: 'USD', unit: 12 },
  ])('maps invalid unit in %j to reason invalid-unit', (value) => {
    expect(normalizeSalary(value)).toEqual({
      kind: 'unknown',
      reason: 'invalid-unit',
      raw: value,
    });
  });

  it('preserves an unsupported currency for the currency converter', () => {
    expect(normalizeSalary({ value: 120_000, currency: ' xyz ' })).toEqual({
      kind: 'annual',
      amount: 120_000,
      currency: 'XYZ',
      source: 'explicit',
    });
  });
});
