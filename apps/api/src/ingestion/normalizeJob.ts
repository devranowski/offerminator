import { z } from 'zod';

import type { NormalizedJobCandidate } from '../models/normalizedJob.js';
import type { RawJobEnvelope } from '../models/rawJob.js';
import {
  normalizeCompanyType,
  normalizeEmploymentType,
  normalizeLanguage,
} from './normalizeEnums.js';
import { normalizeLocation } from './normalizeLocation.js';
import { normalizePostingDate } from './normalizePostingDate.js';
import { normalizeSalary } from './normalizeSalary.js';
import { normalizeOptionalString } from './normalizeString.js';

const rawRecordSchema = z.record(z.string(), z.unknown());

export function normalizeJob(envelope: RawJobEnvelope): NormalizedJobCandidate | null {
  const parsedPayload = rawRecordSchema.safeParse(envelope.payload);

  if (!parsedPayload.success) {
    return null;
  }

  const record = parsedPayload.data;
  const postingDateResult = normalizePostingDate(record['posting_date']);

  return {
    id: envelope.id,
    source: envelope.source,
    sourceIndex: envelope.sourceIndex,
    title: normalizeOptionalString(record['title']),
    description: normalizeOptionalString(record['description']),
    company: normalizeOptionalString(record['company']),
    location: normalizeLocation(record['location'], record['remote']),
    salary: normalizeSalary(record['salary']),
    employmentType: normalizeEmploymentType(record['employment_type']),
    companyType: normalizeCompanyType(record['company_type']),
    language: normalizeLanguage(record['language']),
    postingDate: postingDateResult.postingDate,
    warnings: postingDateResult.warnings,
    raw: envelope.payload,
  };
}
