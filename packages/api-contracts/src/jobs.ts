import { z } from 'zod/v4';

export type JobSortDto = 'salary-asc' | 'salary-desc' | 'posting-date-asc' | 'posting-date-desc';

export interface JobsQueryDto {
  readonly q?: string;
  readonly country?: string;
  readonly sort?: JobSortDto;
}

export interface JobLocationDto {
  readonly kind: 'remote' | 'in-person';
  readonly city: string | null;
  readonly region: string | null;
  readonly country: string | null;
}

export interface JobSalaryDto {
  readonly amount: number;
  readonly currency: string;
  readonly period: 'annual' | 'hourly';
  readonly usdEquivalent: number;
  readonly annualizedUsd: number;
}

export interface JobDto {
  readonly id: string;
  readonly title: string;
  readonly company: string | null;
  readonly description: string | null;
  readonly location: JobLocationDto;
  readonly salary: JobSalaryDto;
  readonly postingDate: string | null;
}

export interface JobsResponseDto {
  readonly items: readonly JobDto[];
  readonly total: number;
}

const nonnegativeIntegerSchema = z.number().int().nonnegative();

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
  postingDate: z.iso.date().nullable(),
});

const jobsResponseSchema = z
  .object({
    items: z.array(jobSchema).readonly(),
    total: nonnegativeIntegerSchema,
  })
  .refine(({ items, total }) => total === items.length, {
    message: 'Total must match the number of items.',
    path: ['total'],
  }) satisfies z.ZodType<JobsResponseDto>;

export { jobsResponseSchema };
