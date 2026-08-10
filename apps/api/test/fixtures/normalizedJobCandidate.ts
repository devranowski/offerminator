import { createCountryCode, type CountryCode } from '../../src/models/countryCode.js';
import type { NormalizedJobCandidate } from '../../src/models/normalizedJob.js';

export function createNormalizedJobCandidate(
  overrides: Partial<NormalizedJobCandidate> = {},
): NormalizedJobCandidate {
  return {
    id: 'test:0',
    source: 'test',
    sourceIndex: 0,
    title: 'Backend Engineer',
    description: 'Build reliable software.',
    company: 'Example Company',
    location: {
      kind: 'remote',
      city: null,
      region: null,
      country: requiredCountryCode('US'),
      raw: 'Remote, US',
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
    ...overrides,
  };
}

export function requiredCountryCode(value: string): CountryCode {
  const country = createCountryCode(value);

  if (country === null) {
    throw new Error(`Expected ${value} to be a valid country code.`);
  }

  return country;
}
