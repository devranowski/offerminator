import { describe, expect, it } from 'vitest';

import type { IngestionSummary } from '../../ingestion/ingestionSummary.js';
import { createApprovedJob, createApprovedJobCompensation } from '../../models/approvedJob.js';
import { createIsoDate } from '../../models/isoDate.js';
import type { RejectedJob } from '../../models/rejectedJob.js';
import {
  createNormalizedJobCandidate,
  requiredCountryCode,
} from '../../../test/fixtures/normalizedJobCandidate.js';
import { toIngestionSummaryDto } from './toIngestionSummaryDto.js';
import { toJobDto } from './toJobDto.js';
import { toRejectedJobDto } from './toRejectedJobDto.js';

describe('API DTO mappers', () => {
  it('maps an approved job to presentation values without leaking domain-only fields', () => {
    const postingDate = createIsoDate('2024-01-02');

    if (postingDate === null) {
      throw new Error('Expected the synthetic posting date to be valid.');
    }

    const compensation = createApprovedJobCompensation(6_264, 13_029_120);

    if (compensation === null) {
      throw new Error('Expected the synthetic compensation to be valid.');
    }

    const job = createApprovedJob(
      createNormalizedJobCandidate({
        id: 'jobs.json:20',
        title: 'Platform Engineer',
        description: 'Build a reliable platform.',
        company: 'Example Systems',
        location: {
          kind: 'remote',
          city: 'London',
          region: null,
          country: requiredCountryCode('GB'),
          raw: { confidentialSourceValue: true },
        },
        salary: {
          kind: 'hourly',
          amount: 58,
          currency: 'EUR',
          source: 'explicit',
        },
        postingDate,
      }),
      compensation,
    );

    if (job === null) {
      throw new Error('Expected the synthetic job to be approved.');
    }

    expect(toJobDto(job)).toEqual({
      id: 'jobs.json:20',
      title: 'Platform Engineer',
      company: 'Example Systems',
      description: 'Build a reliable platform.',
      location: {
        kind: 'remote',
        city: 'London',
        region: null,
        country: 'GB',
      },
      salary: {
        amount: 58,
        currency: 'EUR',
        period: 'hourly',
        usdEquivalent: 62.64,
        annualizedUsd: 130_291.2,
      },
      postingDate: '2024-01-02',
    });
  });

  it('exposes selected rejection details and raw input without warnings or actual values', () => {
    const raw = {
      title: '',
      salary: null,
    };
    const job: RejectedJob = {
      id: 'jobs.json:19',
      source: 'jobs.json',
      sourceIndex: 19,
      title: null,
      company: 'OpsFlex',
      reasons: [
        {
          code: 'TITLE_MISSING',
          field: 'title',
          message: 'Title must not be empty.',
          actualValue: '',
        },
      ],
      warnings: [
        {
          code: 'INVALID_POSTING_DATE',
          field: 'posting_date',
          message: 'Expected a valid calendar date in YYYY-MM-DD format.',
          actualValue: 'invalid-date',
        },
      ],
      raw,
    };

    const dto = toRejectedJobDto(job);

    expect(dto).toEqual({
      id: 'jobs.json:19',
      title: null,
      company: 'OpsFlex',
      source: 'jobs.json',
      sourceIndex: 19,
      reasons: [
        {
          code: 'TITLE_MISSING',
          field: 'title',
          message: 'Title must not be empty.',
        },
      ],
      raw,
    });
    expect(dto.raw).toBe(raw);
  });

  it('maps an ingestion summary into fresh transport collections', () => {
    const summary: IngestionSummary = {
      totalSources: 2,
      successfulSources: 1,
      failedSources: 1,
      totalRecords: 20,
      approved: 10,
      rejected: 10,
      sources: [
        {
          name: 'jobs.json',
          totalRecords: 20,
          approved: 10,
          rejected: 10,
        },
      ],
      sourceErrors: [
        {
          source: 'broken.json',
          code: 'INVALID_JSON',
          message: 'Source file does not contain valid JSON.',
        },
      ],
    };

    const dto = toIngestionSummaryDto(summary);

    expect(dto).toEqual(summary);
    expect(dto).not.toBe(summary);
    expect(dto.sources).not.toBe(summary.sources);
    expect(dto.sourceErrors).not.toBe(summary.sourceErrors);

    const [dtoSource] = dto.sources;
    const [source] = summary.sources;
    const [dtoError] = dto.sourceErrors;
    const [sourceError] = summary.sourceErrors;

    if (
      dtoSource === undefined ||
      source === undefined ||
      dtoError === undefined ||
      sourceError === undefined
    ) {
      throw new Error('Expected the synthetic summary collections to contain one item.');
    }

    expect(dtoSource).not.toBe(source);
    expect(dtoError).not.toBe(sourceError);
  });
});
