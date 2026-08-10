import type {
  IngestionSummaryDto,
  JobsResponseDto,
  RejectedJobsResponseDto,
} from '@offerminator/api-contracts';
import { z } from 'zod/v4';

const nonnegativeIntegerSchema = z.number().int().nonnegative();

const errorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
});

const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string().nullable(),
  description: z.string().nullable(),
  location: z.object({
    kind: z.enum(['remote', 'in-person']),
    city: z.string().nullable(),
    region: z.string().nullable(),
    country: z.string().nullable(),
  }),
  salary: z.object({
    amount: z.number(),
    currency: z.string(),
    period: z.enum(['annual', 'hourly']),
    usdEquivalent: z.number(),
    annualizedUsd: z.number(),
  }),
  postingDate: z.string().nullable(),
});

export const jobsResponseSchema = z.object({
  items: z.array(jobSchema).readonly(),
  total: nonnegativeIntegerSchema,
}) satisfies z.ZodType<JobsResponseDto>;

const rejectionCodeSchema = z.enum([
  'INVALID_RECORD_SHAPE',
  'TITLE_MISSING',
  'LOCATION_UNKNOWN',
  'IN_PERSON_COUNTRY_UNKNOWN',
  'IN_PERSON_COUNTRY_NOT_ALLOWED',
  'EMPLOYMENT_TYPE_UNKNOWN',
  'EMPLOYMENT_TYPE_NOT_FULL_TIME',
  'SALARY_MISSING',
  'SALARY_INVALID',
  'SALARY_CURRENCY_UNSUPPORTED',
  'ANNUAL_SALARY_BELOW_THRESHOLD',
  'HOURLY_SALARY_BELOW_THRESHOLD',
  'STAFFING_FIRM',
  'COMPANY_TYPE_UNKNOWN',
  'LANGUAGE_MISSING',
  'LANGUAGE_NOT_ALLOWED',
  'PROCESSING_ERROR',
]);

const rejectedJobSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  company: z.string().nullable(),
  source: z.string(),
  sourceIndex: nonnegativeIntegerSchema,
  reasons: z
    .array(
      z.object({
        code: rejectionCodeSchema,
        field: z.string(),
        message: z.string(),
      }),
    )
    .readonly(),
  raw: z.unknown(),
});

export const rejectedJobsResponseSchema = z.object({
  items: z.array(rejectedJobSchema).readonly(),
  total: nonnegativeIntegerSchema,
}) satisfies z.ZodType<RejectedJobsResponseDto>;

const sourceErrorCodeSchema = z.enum([
  'FILE_NOT_FOUND',
  'INVALID_JSON',
  'ROOT_NOT_ARRAY',
  'READ_ERROR',
]);

export const ingestionSummaryResponseSchema = z.object({
  totalSources: nonnegativeIntegerSchema,
  successfulSources: nonnegativeIntegerSchema,
  failedSources: nonnegativeIntegerSchema,
  totalRecords: nonnegativeIntegerSchema,
  approved: nonnegativeIntegerSchema,
  rejected: nonnegativeIntegerSchema,
  sources: z
    .array(
      z.object({
        name: z.string(),
        totalRecords: nonnegativeIntegerSchema,
        approved: nonnegativeIntegerSchema,
        rejected: nonnegativeIntegerSchema,
      }),
    )
    .readonly(),
  sourceErrors: z
    .array(
      z.object({
        source: z.string(),
        code: sourceErrorCodeSchema,
        message: z.string(),
      }),
    )
    .readonly(),
}) satisfies z.ZodType<IngestionSummaryDto>;

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export { errorResponseSchema };
