import type { CountryCode } from '../models/countryCode.js';

export type JobSort = 'salary-asc' | 'salary-desc' | 'posting-date-asc' | 'posting-date-desc';

export interface SearchJobsQuery {
  readonly q?: string;
  readonly country?: CountryCode;
  readonly sort?: JobSort;
}
