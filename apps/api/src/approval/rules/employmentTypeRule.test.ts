import { describe, expect, it } from 'vitest';

import { createNormalizedJobCandidate } from '../../../test/fixtures/normalizedJobCandidate.js';
import { FixedRateCurrencyConverter } from '../../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../../currency/rates.js';
import type { EmploymentType } from '../../models/jobEnums.js';
import { ApprovalContext } from '../approvalContext.js';
import { DefaultCompensationPolicy } from '../compensationPolicy.js';
import { employmentTypeRule } from './employmentTypeRule.js';

const context = new ApprovalContext(
  new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT),
  new DefaultCompensationPolicy(),
);

describe('employmentTypeRule', () => {
  it('accepts full-time employment', () => {
    expect(
      employmentTypeRule(createNormalizedJobCandidate({ employmentType: 'full-time' }), context),
    ).toEqual([]);
  });

  it.each(['part-time', 'contract', 'internship'] satisfies readonly EmploymentType[])(
    'rejects the known non-full-time type %s',
    (employmentType) => {
      expect(employmentTypeRule(createNormalizedJobCandidate({ employmentType }), context)).toEqual(
        [
          {
            code: 'EMPLOYMENT_TYPE_NOT_FULL_TIME',
            field: 'employment_type',
            message: 'Employment type must be full-time.',
            actualValue: employmentType,
          },
        ],
      );
    },
  );

  it('rejects an unknown employment type distinctly', () => {
    expect(
      employmentTypeRule(createNormalizedJobCandidate({ employmentType: 'unknown' }), context),
    ).toEqual([
      {
        code: 'EMPLOYMENT_TYPE_UNKNOWN',
        field: 'employment_type',
        message: 'Employment type must be known.',
        actualValue: 'unknown',
      },
    ]);
  });
});
