import { describe, expect, it } from 'vitest';

import { createNormalizedJobCandidate } from '../../../test/fixtures/normalizedJobCandidate.js';
import { FixedRateCurrencyConverter } from '../../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../../currency/rates.js';
import { ApprovalContext } from '../approvalContext.js';
import { DefaultCompensationPolicy } from '../compensationPolicy.js';
import { titleRule } from './titleRule.js';

const context = new ApprovalContext(
  new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT),
  new DefaultCompensationPolicy(),
);

describe('titleRule', () => {
  it.each(['Backend Engineer', '  Backend Engineer  '])('accepts the title %j', (title) => {
    expect(titleRule(createNormalizedJobCandidate({ title }), context)).toEqual([]);
  });

  it.each(['', '   ', null])('rejects the missing title %j', (title) => {
    expect(titleRule(createNormalizedJobCandidate({ title }), context)).toEqual([
      {
        code: 'TITLE_MISSING',
        field: 'title',
        message: 'Title must not be empty.',
        actualValue: title,
      },
    ]);
  });
});
