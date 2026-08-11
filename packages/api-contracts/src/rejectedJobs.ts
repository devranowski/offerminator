import { z } from 'zod/v4';

export type RejectionCodeDto =
  | 'INVALID_RECORD_SHAPE'
  | 'TITLE_MISSING'
  | 'LOCATION_UNKNOWN'
  | 'IN_PERSON_COUNTRY_UNKNOWN'
  | 'IN_PERSON_COUNTRY_NOT_ALLOWED'
  | 'EMPLOYMENT_TYPE_UNKNOWN'
  | 'EMPLOYMENT_TYPE_NOT_FULL_TIME'
  | 'SALARY_MISSING'
  | 'SALARY_INVALID'
  | 'SALARY_CURRENCY_UNSUPPORTED'
  | 'ANNUAL_SALARY_BELOW_THRESHOLD'
  | 'HOURLY_SALARY_BELOW_THRESHOLD'
  | 'STAFFING_FIRM'
  | 'COMPANY_TYPE_UNKNOWN'
  | 'LANGUAGE_MISSING'
  | 'LANGUAGE_NOT_ALLOWED'
  | 'PROCESSING_ERROR';

export type RawJobPreviewDto =
  | null
  | boolean
  | number
  | string
  | readonly RawJobPreviewDto[]
  | { readonly [key: string]: RawJobPreviewDto };

export interface RejectionReasonDto {
  readonly code: RejectionCodeDto;
  readonly field: string;
  readonly message: string;
}

export interface RejectedJobDto {
  readonly id: string;
  readonly title: string | null;
  readonly company: string | null;
  readonly source: string;
  readonly sourceIndex: number;
  readonly reasons: readonly RejectionReasonDto[];
  readonly raw: RawJobPreviewDto;
  readonly rawPreviewTruncated: boolean;
}

export interface RejectedJobsResponseDto {
  readonly items: readonly RejectedJobDto[];
  readonly total: number;
}

interface RawJobPreviewNode {
  readonly value: unknown;
  readonly depth: number;
}

const rawJobPreviewMaxDepth = 8;
const rawJobPreviewMaxEntries = 100;
const rawJobPreviewMaxKeyLength = 128;
const rawJobPreviewMaxStringLength = 1_024;

const nonnegativeIntegerSchema = z.number().int().nonnegative();

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
  raw: z.custom<RawJobPreviewDto>(
    isRawJobPreview,
    'Raw record preview exceeds the supported transport limits.',
  ),
  rawPreviewTruncated: z.boolean(),
});

const rejectedJobsResponseSchema = z
  .object({
    items: z.array(rejectedJobSchema).readonly(),
    total: nonnegativeIntegerSchema,
  })
  .refine(({ items, total }) => total === items.length, {
    message: 'Total must match the number of rejected jobs.',
    path: ['total'],
  }) satisfies z.ZodType<RejectedJobsResponseDto>;

function isRawJobPreview(value: unknown): value is RawJobPreviewDto {
  const pending: RawJobPreviewNode[] = [{ value, depth: 0 }];
  const seenObjects = new WeakSet<object>();
  let entryCount = 0;

  while (pending.length > 0) {
    const node = pending.pop();

    if (node === undefined) {
      return false;
    }

    const currentValue = node.value;

    if (
      currentValue === null ||
      typeof currentValue === 'boolean' ||
      (typeof currentValue === 'number' && Number.isFinite(currentValue))
    ) {
      continue;
    }

    if (typeof currentValue === 'string') {
      if (currentValue.length > rawJobPreviewMaxStringLength) {
        return false;
      }

      continue;
    }

    if (typeof currentValue !== 'object' || node.depth >= rawJobPreviewMaxDepth) {
      return false;
    }

    if (seenObjects.has(currentValue)) {
      return false;
    }

    seenObjects.add(currentValue);

    if (Array.isArray(currentValue)) {
      entryCount += currentValue.length;

      if (entryCount > rawJobPreviewMaxEntries) {
        return false;
      }

      for (const item of currentValue) {
        const itemValue: unknown = item;
        pending.push({ value: itemValue, depth: node.depth + 1 });
      }

      continue;
    }

    for (const key in currentValue) {
      if (!Object.hasOwn(currentValue, key)) {
        continue;
      }

      entryCount += 1;

      if (entryCount > rawJobPreviewMaxEntries || key.length > rawJobPreviewMaxKeyLength) {
        return false;
      }

      const propertyValue: unknown = Reflect.get(currentValue, key);
      pending.push({ value: propertyValue, depth: node.depth + 1 });
    }
  }

  return true;
}

export {
  rawJobPreviewMaxDepth,
  rawJobPreviewMaxEntries,
  rawJobPreviewMaxKeyLength,
  rawJobPreviewMaxStringLength,
  rejectedJobsResponseSchema,
};
