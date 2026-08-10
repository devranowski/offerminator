import type { CountryCode } from './countryCode.js';

export interface RemoteJobLocation {
  readonly kind: 'remote';
  readonly city: string | null;
  readonly region: string | null;
  readonly country: CountryCode | null;
  readonly raw: unknown;
}

export interface InPersonJobLocation {
  readonly kind: 'in-person';
  readonly city: string | null;
  readonly region: string | null;
  readonly country: CountryCode | null;
  readonly raw: unknown;
}

export interface UnknownJobLocation {
  readonly kind: 'unknown';
  readonly city: null;
  readonly region: null;
  readonly country: null;
  readonly raw: unknown;
}

export type JobLocation = RemoteJobLocation | InPersonJobLocation | UnknownJobLocation;

export type ApprovedInPersonCountryCode = CountryCode & ('US' | 'CA');

export type ApprovedInPersonLocation = Omit<InPersonJobLocation, 'country'> & {
  readonly country: ApprovedInPersonCountryCode;
};

export type ApprovedLocation = RemoteJobLocation | ApprovedInPersonLocation;

function isApprovedInPersonCountry(value: CountryCode): value is ApprovedInPersonCountryCode {
  return value === 'US' || value === 'CA';
}

export { isApprovedInPersonCountry };
