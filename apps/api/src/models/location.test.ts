import { describe, expect, it } from 'vitest';

import { createCountryCode } from './countryCode.js';
import { isApprovedInPersonCountry } from './location.js';

describe('isApprovedInPersonCountry', () => {
  it.each([
    ['US', true],
    ['CA', true],
    ['GB', false],
    ['DE', false],
  ] as const)('classifies %s as approved: %s', (value, expected) => {
    const country = createCountryCode(value);

    if (country === null) {
      throw new Error(`Expected ${value} to be a valid country code.`);
    }

    expect(isApprovedInPersonCountry(country)).toBe(expected);
  });
});
