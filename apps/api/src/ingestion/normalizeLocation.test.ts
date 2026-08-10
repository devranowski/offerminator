import { describe, expect, it } from 'vitest';

import type { JobLocation } from '../models/location.js';

import { normalizeLocation } from './normalizeLocation.js';

interface ExpectedLocation {
  readonly kind: JobLocation['kind'];
  readonly city: string | null;
  readonly region: string | null;
  readonly country: string | null;
}

describe('normalizeLocation', () => {
  describe('object locations', () => {
    it('maps state to region, ignores region and extra keys, and preserves raw input', () => {
      const value = {
        city: ' Austin ',
        state: ' TX ',
        country: ' USA ',
        region: 'ignored',
        extra: 'ignored',
      };

      expectLocation(value, false, {
        kind: 'in-person',
        city: 'Austin',
        region: 'TX',
        country: 'US',
      });
    });

    it.each([
      [
        { city: '', state: 'CA', country: 'USA' },
        { kind: 'in-person', city: null, region: 'CA', country: 'US' },
      ],
      [
        { city: 'Berlin', state: '', country: 'Germany' },
        { kind: 'in-person', city: 'Berlin', region: null, country: 'DE' },
      ],
    ] satisfies ReadonlyArray<readonly [Record<string, unknown>, ExpectedLocation]>)(
      'normalizes nullable fields in %#',
      (value, expected) => {
        expectLocation(value, false, expected);
      },
    );

    it.each([
      ['UsA', 'US'],
      ['us', 'US'],
      ['UNITED STATES', 'US'],
      ['Canada', 'CA'],
      ['uK', 'GB'],
      ['United Kingdom', 'GB'],
      ['Germany', 'DE'],
      ['Ireland', 'IE'],
    ])('resolves the country alias %s as %s', (country, expectedCountry) => {
      expectLocation({ country: ` ${country} ` }, false, {
        kind: 'in-person',
        city: null,
        region: null,
        country: expectedCountry,
      });
    });

    it.each([
      ['PL', 'PL'],
      ['pl', null],
      ['Freedonia', null],
    ])('resolves the object country %s as %s', (country, expectedCountry) => {
      expectLocation({ country }, undefined, {
        kind: 'in-person',
        city: null,
        region: null,
        country: expectedCountry,
      });
    });

    it('does not treat an ignored region field as physical location data', () => {
      expectLocation({ region: 'Ontario' }, undefined, {
        kind: 'unknown',
        city: null,
        region: null,
        country: null,
      });
    });
  });

  describe('string locations', () => {
    it.each([
      ['Boston, MA, USA', 'Boston', 'MA', 'US'],
      ['New York, NY, USA', 'New York', 'NY', 'US'],
      ['Toronto, ON, Canada', 'Toronto', 'ON', 'CA'],
      ['Dublin, Leinster, ignored, Ireland', 'Dublin', 'Leinster', 'IE'],
    ])('parses the three-or-more-segment location %s', (value, city, region, country) => {
      expectLocation(value, undefined, {
        kind: 'in-person',
        city,
        region,
        country,
      });
    });

    it.each([
      ['London, UK', 'London', 'GB'],
      ['Paris, Freedonia', 'Paris', null],
      ['Warsaw, PL', 'Warsaw', 'PL'],
      ['Warsaw, pl', 'Warsaw', null],
    ])('parses the two-segment location %s', (value, city, country) => {
      expectLocation(value, undefined, {
        kind: 'in-person',
        city,
        region: null,
        country,
      });
    });

    it.each([
      ['CA', null, 'CA'],
      ['Atlantis', 'Atlantis', null],
    ])('parses the one-segment location %s', (value, city, country) => {
      expectLocation(value, undefined, {
        kind: 'in-person',
        city,
        region: null,
        country,
      });
    });

    it.each(['Remote', '  remote  ', 'REMOTE'])('recognizes the remote signal %j', (value) => {
      expectLocation(value, undefined, {
        kind: 'remote',
        city: null,
        region: null,
        country: null,
      });
    });

    it('recognizes Remote only when it is the entire string', () => {
      expectLocation('Remote, US', undefined, {
        kind: 'in-person',
        city: 'Remote',
        region: null,
        country: 'US',
      });
    });

    it.each(['', '   ', ', , '])('treats the empty location %j as unknown', (value) => {
      expectLocation(value, undefined, {
        kind: 'unknown',
        city: null,
        region: null,
        country: null,
      });
    });
  });

  describe('remote precedence', () => {
    it('lets literal true override a physical location and keeps its metadata', () => {
      expectLocation({ city: 'Paris', country: 'FR' }, true, {
        kind: 'remote',
        city: 'Paris',
        region: null,
        country: 'FR',
      });
    });

    it('keeps the parsed GB metadata for the remote Project Manager location', () => {
      expectLocation('London, UK', true, {
        kind: 'remote',
        city: 'London',
        region: null,
        country: 'GB',
      });
    });

    it('lets literal false override a Remote location string', () => {
      expectLocation('Remote', false, {
        kind: 'in-person',
        city: null,
        region: null,
        country: null,
      });
    });

    it('does not coerce an unknown remote value', () => {
      expectLocation(null, 'false', {
        kind: 'unknown',
        city: null,
        region: null,
        country: null,
      });
    });

    it.each([
      [true, 'remote'],
      [false, 'in-person'],
    ] as const)('uses remote %s when location is null', (remote, kind) => {
      expectLocation(null, remote, {
        kind,
        city: null,
        region: null,
        country: null,
      });
    });
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
    ['an array', []],
    ['an empty object', {}],
  ] satisfies ReadonlyArray<readonly [string, unknown]>)(
    'treats %s location as unknown',
    (_caseName, value) => {
      expectLocation(value, undefined, {
        kind: 'unknown',
        city: null,
        region: null,
        country: null,
      });
    },
  );
});

function expectLocation(value: unknown, remote: unknown, expected: ExpectedLocation): void {
  const result = normalizeLocation(value, remote);

  expect(result).toEqual({ ...expected, raw: value });
  expect(result.raw).toBe(value);
}
