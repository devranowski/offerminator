import { createCountryCode, type CountryCode } from '../models/countryCode.js';
import type { JobLocation } from '../models/location.js';

import { normalizeOptionalString } from './normalizeString.js';

const COUNTRY_ALIASES: Readonly<Record<string, string>> = {
  usa: 'US',
  us: 'US',
  'united states': 'US',
  canada: 'CA',
  uk: 'GB',
  'united kingdom': 'GB',
  germany: 'DE',
  ireland: 'IE',
};

type ParsedLocation =
  | {
      readonly signal: 'none';
      readonly city: null;
      readonly region: null;
      readonly country: null;
    }
  | {
      readonly signal: 'remote';
      readonly city: null;
      readonly region: null;
      readonly country: null;
    }
  | {
      readonly signal: 'physical';
      readonly city: string | null;
      readonly region: string | null;
      readonly country: CountryCode | null;
    };

const NO_LOCATION: ParsedLocation = {
  signal: 'none',
  city: null,
  region: null,
  country: null,
};

const REMOTE_LOCATION: ParsedLocation = {
  signal: 'remote',
  city: null,
  region: null,
  country: null,
};

function resolveCountry(value: string | null): CountryCode | null {
  if (value === null) {
    return null;
  }

  const alias = COUNTRY_ALIASES[value.toLowerCase()];

  return createCountryCode(alias ?? value);
}

function isLocationObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseObjectLocation(value: Record<string, unknown>): ParsedLocation {
  const city = normalizeOptionalString(value.city);
  const region = normalizeOptionalString(value.state);
  const countryValue = normalizeOptionalString(value.country);

  if (city === null && region === null && countryValue === null) {
    return NO_LOCATION;
  }

  return {
    signal: 'physical',
    city,
    region,
    country: resolveCountry(countryValue),
  };
}

function parseStringLocation(value: string): ParsedLocation {
  const normalizedValue = normalizeOptionalString(value);

  if (normalizedValue === null) {
    return NO_LOCATION;
  }

  if (normalizedValue.toLowerCase() === 'remote') {
    return REMOTE_LOCATION;
  }

  const segments = normalizedValue
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const [firstSegment, secondSegment, ...remainingSegments] = segments;

  if (firstSegment === undefined) {
    return NO_LOCATION;
  }

  if (secondSegment === undefined) {
    const country = resolveCountry(firstSegment);

    return {
      signal: 'physical',
      city: country === null ? firstSegment : null,
      region: null,
      country,
    };
  }

  const countryCandidate = remainingSegments.at(-1) ?? secondSegment;

  return {
    signal: 'physical',
    city: firstSegment,
    region: remainingSegments.length === 0 ? null : secondSegment,
    country: resolveCountry(countryCandidate),
  };
}

function parseLocation(value: unknown): ParsedLocation {
  if (typeof value === 'string') {
    return parseStringLocation(value);
  }

  if (isLocationObject(value)) {
    return parseObjectLocation(value);
  }

  return NO_LOCATION;
}

export function normalizeLocation(value: unknown, remote: unknown): JobLocation {
  const parsedLocation = parseLocation(value);

  if (remote === true) {
    return createKnownLocation('remote', parsedLocation, value);
  }

  if (remote === false) {
    return createKnownLocation('in-person', parsedLocation, value);
  }

  if (parsedLocation.signal === 'remote') {
    return createKnownLocation('remote', parsedLocation, value);
  }

  if (parsedLocation.signal === 'physical') {
    return createKnownLocation('in-person', parsedLocation, value);
  }

  return {
    kind: 'unknown',
    city: null,
    region: null,
    country: null,
    raw: value,
  };
}

function createKnownLocation(
  kind: 'remote' | 'in-person',
  parsedLocation: ParsedLocation,
  raw: unknown,
): JobLocation {
  return {
    kind,
    city: parsedLocation.city,
    region: parsedLocation.region,
    country: parsedLocation.country,
    raw,
  };
}
