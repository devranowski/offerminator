import { describe, expect, it } from 'vitest';

import { createNormalizedJobCandidate } from '../../../test/fixtures/normalizedJobCandidate.js';
import { FixedRateCurrencyConverter } from '../../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../../currency/rates.js';
import type { CompanyType } from '../../models/jobEnums.js';
import { ApprovalContext } from '../approvalContext.js';
import { DefaultCompensationPolicy } from '../compensationPolicy.js';
import { companyTypeRule } from './companyTypeRule.js';

const context = new ApprovalContext(
  new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT),
  new DefaultCompensationPolicy(),
);

describe('companyTypeRule', () => {
  it.each(['direct-employer', 'consulting-agency'] satisfies readonly CompanyType[])(
    'accepts %s',
    (companyType) => {
      expect(companyTypeRule(createNormalizedJobCandidate({ companyType }), context)).toEqual([]);
    },
  );

  it('rejects a staffing firm', () => {
    expect(
      companyTypeRule(createNormalizedJobCandidate({ companyType: 'staffing-firm' }), context),
    ).toEqual([
      {
        code: 'STAFFING_FIRM',
        field: 'company_type',
        message: 'Staffing firms are not allowed.',
        actualValue: 'staffing-firm',
      },
    ]);
  });

  it('rejects an unknown company type distinctly', () => {
    expect(
      companyTypeRule(createNormalizedJobCandidate({ companyType: 'unknown' }), context),
    ).toEqual([
      {
        code: 'COMPANY_TYPE_UNKNOWN',
        field: 'company_type',
        message: 'Company type must be known.',
        actualValue: 'unknown',
      },
    ]);
  });
});
