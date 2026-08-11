import { z } from 'zod/v4';

export type SourceErrorCodeDto =
  'FILE_NOT_FOUND' | 'INVALID_JSON' | 'ROOT_NOT_ARRAY' | 'READ_ERROR';

export interface SourceSummaryDto {
  readonly name: string;
  readonly totalRecords: number;
  readonly approved: number;
  readonly rejected: number;
}

export interface SourceErrorDto {
  readonly source: string;
  readonly code: SourceErrorCodeDto;
  readonly message: string;
}

export interface IngestionSummaryDto {
  readonly totalSources: number;
  readonly successfulSources: number;
  readonly failedSources: number;
  readonly totalRecords: number;
  readonly approved: number;
  readonly rejected: number;
  readonly sources: readonly SourceSummaryDto[];
  readonly sourceErrors: readonly SourceErrorDto[];
}

const nonnegativeIntegerSchema = z.number().int().nonnegative();

const sourceErrorCodeSchema = z.enum([
  'FILE_NOT_FOUND',
  'INVALID_JSON',
  'ROOT_NOT_ARRAY',
  'READ_ERROR',
]);

const ingestionSummaryResponseSchema = z.object({
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

export { ingestionSummaryResponseSchema };
