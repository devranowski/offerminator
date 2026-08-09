import { createIsoDate, type IsoDate } from '../models/isoDate.js';
import type { NormalizationWarning } from '../models/normalizationWarning.js';
import { normalizeOptionalString } from './normalizeString.js';

export interface PostingDateNormalizationResult {
  readonly postingDate: IsoDate | null;
  readonly warnings: readonly NormalizationWarning[];
}

export function normalizePostingDate(value: unknown): PostingDateNormalizationResult {
  if (value === null || value === undefined) {
    return withoutPostingDate();
  }

  const normalized = normalizeOptionalString(value);

  if (normalized === null) {
    return typeof value === 'string' ? withoutPostingDate() : invalidPostingDate(value);
  }

  const postingDate = createIsoDate(normalized);

  return postingDate === null ? invalidPostingDate(value) : { postingDate, warnings: [] };
}

function withoutPostingDate(): PostingDateNormalizationResult {
  return { postingDate: null, warnings: [] };
}

function invalidPostingDate(actualValue: unknown): PostingDateNormalizationResult {
  return {
    postingDate: null,
    warnings: [
      {
        code: 'INVALID_POSTING_DATE',
        field: 'posting_date',
        message: 'Expected a valid calendar date in YYYY-MM-DD format.',
        actualValue,
      },
    ],
  };
}
