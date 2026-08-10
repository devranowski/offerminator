import { describe, expect, it } from 'vitest';

import {
  createNormalizedJobCandidate,
  requiredCountryCode,
} from '../../../test/fixtures/normalizedJobCandidate.js';
import { FixedRateCurrencyConverter } from '../../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../../currency/rates.js';
import type { JobLocation } from '../../models/location.js';
import { ApprovalContext } from '../approvalContext.js';
import { DefaultCompensationPolicy } from '../compensationPolicy.js';
import { locationRule } from './locationRule.js';

const context = new ApprovalContext(
  new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT),
  new DefaultCompensationPolicy(),
);

describe('locationRule', () => {
  it.each([
    ['a remote UK job', remoteLocation('GB')],
    ['a remote job without a country', remoteLocation(null)],
    ['an in-person US job', inPersonLocation('US')],
    ['an in-person Canadian job', inPersonLocation('CA')],
  ] satisfies ReadonlyArray<readonly [string, JobLocation]>)(
    'accepts %s',
    (_caseName, location) => {
      expect(locationRule(createNormalizedJobCandidate({ location }), context)).toEqual([]);
    },
  );

  it('rejects an in-person job in Germany', () => {
    const location = inPersonLocation('DE');

    expect(locationRule(createNormalizedJobCandidate({ location }), context)).toEqual([
      {
        code: 'IN_PERSON_COUNTRY_NOT_ALLOWED',
        field: 'location.country',
        message: 'In-person jobs must be located in the US or Canada.',
        actualValue: requiredCountryCode('DE'),
      },
    ]);
  });

  it('rejects an in-person job without a country', () => {
    const location = inPersonLocation(null);

    expect(locationRule(createNormalizedJobCandidate({ location }), context)).toEqual([
      {
        code: 'IN_PERSON_COUNTRY_UNKNOWN',
        field: 'location.country',
        message: 'Country is required for an in-person job.',
        actualValue: null,
      },
    ]);
  });

  it('rejects a job with an unknown location mode', () => {
    const location: JobLocation = {
      kind: 'unknown',
      city: null,
      region: null,
      country: null,
      raw: null,
    };

    expect(locationRule(createNormalizedJobCandidate({ location }), context)).toEqual([
      {
        code: 'LOCATION_UNKNOWN',
        field: 'location',
        message: 'Location mode must be known.',
        actualValue: 'unknown',
      },
    ]);
  });
});

function remoteLocation(countryValue: string | null): JobLocation {
  return {
    kind: 'remote',
    city: null,
    region: null,
    country: countryValue === null ? null : requiredCountryCode(countryValue),
    raw: countryValue === null ? 'Remote' : `Remote, ${countryValue}`,
  };
}

function inPersonLocation(countryValue: string | null): JobLocation {
  return {
    kind: 'in-person',
    city: null,
    region: null,
    country: countryValue === null ? null : requiredCountryCode(countryValue),
    raw: countryValue,
  };
}
