import { describe, expect, it } from 'vitest';

import { normalizePostingDate } from './normalizePostingDate.js';

describe('normalizePostingDate', () => {
  it.each([
    ['2023-10-03', '2023-10-03'],
    [' 2024-02-29 ', '2024-02-29'],
  ] as const)('normalizes the calendar date %j', (value, expected) => {
    expect(normalizePostingDate(value)).toEqual({
      postingDate: expected,
      warnings: [],
    });
  });

  it.each([undefined, null, '', '   '])('treats %j as a missing date', (value) => {
    expect(normalizePostingDate(value)).toEqual({
      postingDate: null,
      warnings: [],
    });
  });

  it.each(['2023/10/03', '2023-02-29', 20231003])(
    'warns about invalid posting date %j',
    (value) => {
      expect(normalizePostingDate(value)).toEqual({
        postingDate: null,
        warnings: [
          {
            code: 'INVALID_POSTING_DATE',
            field: 'posting_date',
            message: 'Expected a valid calendar date in YYYY-MM-DD format.',
            actualValue: value,
          },
        ],
      });
    },
  );
});
