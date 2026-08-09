import { describe, expect, it } from 'vitest';

import { normalizeOptionalString } from './normalizeString.js';

describe('normalizeOptionalString', () => {
  it.each([
    ['  Engineer  ', 'Engineer'],
    ['', null],
    ['   ', null],
    [null, null],
    [42, null],
  ] as const)('normalizes %j to %j', (value, expected) => {
    expect(normalizeOptionalString(value)).toBe(expected);
  });
});
