import { describe, expect, it } from 'vitest';

import { createCountryCode } from './countryCode.js';
import { createIsoDate } from './isoDate.js';
import { createNonEmptyString } from './nonEmptyString.js';

describe('createNonEmptyString', () => {
  it('creates a branded value from a canonical non-empty string', () => {
    expect(createNonEmptyString('Backend Engineer')).toBe('Backend Engineer');
  });

  it.each(['', '   ', ' Backend Engineer', 'Backend Engineer '])(
    'rejects a non-canonical value %j',
    (value) => {
      expect(createNonEmptyString(value)).toBeNull();
    },
  );
});

describe('createIsoDate', () => {
  it.each(['2023-02-28', '2024-02-29', '2023-12-31'])(
    'creates a branded value for the calendar date %s',
    (value) => {
      expect(createIsoDate(value)).toBe(value);
    },
  );

  it.each(['', '2023-2-01', '2023-02-29', '2024-04-31', '2024-00-01', '2024-01-00'])(
    'rejects the invalid calendar date %j',
    (value) => {
      expect(createIsoDate(value)).toBeNull();
    },
  );
});

describe('createCountryCode', () => {
  it.each(['US', 'CA', 'GB', 'DE'])('creates a branded value for %s', (value) => {
    expect(createCountryCode(value)).toBe(value);
  });

  it.each(['', 'us', 'USA', 'U1', ' US', 'UK', 'ZZ'])(
    'rejects the non-canonical or unassigned code %j',
    (value) => {
      expect(createCountryCode(value)).toBeNull();
    },
  );
});
