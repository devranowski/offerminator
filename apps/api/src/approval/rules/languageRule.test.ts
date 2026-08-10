import { describe, expect, it } from 'vitest';

import {
  createNormalizedJobCandidate,
  requiredCountryCode,
} from '../../../test/fixtures/normalizedJobCandidate.js';
import { FixedRateCurrencyConverter } from '../../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../../currency/rates.js';
import type { JobLanguage } from '../../models/jobEnums.js';
import type { JobLocation } from '../../models/location.js';
import { ApprovalContext } from '../approvalContext.js';
import { DefaultCompensationPolicy } from '../compensationPolicy.js';
import { languageRule } from './languageRule.js';

const context = new ApprovalContext(
  new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT),
  new DefaultCompensationPolicy(),
);

describe('languageRule', () => {
  it.each([
    ['English in the US', 'english', inPersonLocation('US')],
    ['English in Canada', 'english', inPersonLocation('CA')],
    ['English for a remote UK job', 'english', remoteLocation('GB')],
    ['French in Canada', 'french', inPersonLocation('CA')],
  ] satisfies ReadonlyArray<readonly [string, JobLanguage, JobLocation]>)(
    'accepts %s',
    (_caseName, language, location) => {
      expect(languageRule(createNormalizedJobCandidate({ language, location }), context)).toEqual(
        [],
      );
    },
  );

  it.each([
    ['French in the US', 'french', inPersonLocation('US')],
    ['French without a known country', 'french', remoteLocation(null)],
    ['German normalized to another language', 'other', inPersonLocation('US')],
  ] satisfies ReadonlyArray<readonly [string, JobLanguage, JobLocation]>)(
    'rejects %s',
    (_caseName, language, location) => {
      expect(languageRule(createNormalizedJobCandidate({ language, location }), context)).toEqual([
        {
          code: 'LANGUAGE_NOT_ALLOWED',
          field: 'language',
          message: 'Language must be English, or French for jobs in Canada.',
          actualValue: language,
        },
      ]);
    },
  );

  it('reports a missing language distinctly', () => {
    expect(languageRule(createNormalizedJobCandidate({ language: 'unknown' }), context)).toEqual([
      {
        code: 'LANGUAGE_MISSING',
        field: 'language',
        message: 'Language is required.',
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

function inPersonLocation(countryValue: string): JobLocation {
  return {
    kind: 'in-person',
    city: null,
    region: null,
    country: requiredCountryCode(countryValue),
    raw: countryValue,
  };
}
