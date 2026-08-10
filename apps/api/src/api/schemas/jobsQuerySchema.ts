import { z } from 'zod/v4';

import { createCountryCode } from '../../models/countryCode.js';
import type { JobSort, SearchJobsQuery } from '../../search/searchQuery.js';

const JOB_SORTS = [
  'salary-asc',
  'salary-desc',
  'posting-date-asc',
  'posting-date-desc',
] as const satisfies readonly JobSort[];

const countrySchema = z.string().transform((value, context) => {
  const country = createCountryCode(value.trim().toUpperCase());

  if (country === null) {
    context.addIssue({
      code: 'custom',
      message: 'Country must be a valid two-letter ISO country code.',
    });

    return z.NEVER;
  }

  return country;
});

export const jobsQuerySchema = z
  .object({
    q: z.string().optional(),
    country: countrySchema.optional(),
    sort: z.enum(JOB_SORTS).optional(),
  })
  .transform((query): SearchJobsQuery => ({
    ...(query.q === undefined ? {} : { q: query.q }),
    ...(query.country === undefined ? {} : { country: query.country }),
    ...(query.sort === undefined ? {} : { sort: query.sort }),
  }));
