import { describe, expect, it } from 'vitest';

import { createCountryCode, type CountryCode } from './countryCode.js';
import type { JobLanguage } from './jobEnums.js';
import { isApprovedLanguageForCountry } from './languageEligibility.js';

const canada = requiredCountryCode('CA');

describe('isApprovedLanguageForCountry', () => {
  it.each([
    ['English in the US', 'english', requiredCountryCode('US'), true],
    ['English without a known country', 'english', null, true],
    ['French in Canada', 'french', canada, true],
    ['French in the US', 'french', requiredCountryCode('US'), false],
    ['French without a known country', 'french', null, false],
    ['Another language in Canada', 'other', canada, false],
    ['Unknown language in Canada', 'unknown', canada, false],
  ] satisfies ReadonlyArray<readonly [string, JobLanguage, CountryCode | null, boolean]>)(
    'classifies %s as approved: %s',
    (_caseName, language, country, expected) => {
      expect(isApprovedLanguageForCountry(language, country)).toBe(expected);
    },
  );
});

function requiredCountryCode(value: string): CountryCode {
  const country = createCountryCode(value);

  if (country === null) {
    throw new Error(`Expected ${value} to be a valid country code.`);
  }

  return country;
}
