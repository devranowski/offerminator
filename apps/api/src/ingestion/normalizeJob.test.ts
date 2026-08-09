import { describe, expect, it } from 'vitest';

import type { RawJobEnvelope } from '../models/rawJob.js';
import { normalizeJob } from './normalizeJob.js';

const hybridPayload = {
  title: 'Hybrid Job',
  location: 'Toronto, ON, Canada',
  salary: {
    value: 120_000,
    currency: 'USD',
  },
  employment_type: 'Full-Time',
  company_type: 'Direct Employer',
  language: 'English',
  remote: false,
};

describe('normalizeJob', () => {
  it('normalizes every field of a hybrid record independently', () => {
    const envelope = createEnvelope(hybridPayload);
    const candidate = normalizeJob(envelope);

    if (candidate === null) {
      throw new Error('Expected the hybrid record to produce a normalized candidate.');
    }

    expect(candidate).toMatchObject({
      id: 'jobs.json:0',
      source: 'jobs.json',
      sourceIndex: 0,
      title: 'Hybrid Job',
      description: null,
      company: null,
      location: {
        kind: 'in-person',
        city: 'Toronto',
        region: 'ON',
        country: 'CA',
        raw: hybridPayload.location,
      },
      salary: {
        kind: 'annual',
        amount: 120_000,
        currency: 'USD',
        source: 'explicit',
      },
      employmentType: 'full-time',
      companyType: 'direct-employer',
      language: 'english',
      postingDate: null,
      warnings: [],
    });
    expect(candidate.raw).toBe(hybridPayload);
  });

  it('keeps the candidate when one field is invalid', () => {
    const payload = {
      ...hybridPayload,
      salary: 'not a salary',
    };
    const candidate = normalizeJob(createEnvelope(payload));

    if (candidate === null) {
      throw new Error('Expected an invalid field not to discard the whole record.');
    }

    expect(candidate.salary).toEqual({
      kind: 'unknown',
      reason: 'invalid-value',
      raw: 'not a salary',
    });
    expect(candidate).toMatchObject({
      title: 'Hybrid Job',
      location: {
        kind: 'in-person',
        country: 'CA',
      },
      employmentType: 'full-time',
      companyType: 'direct-employer',
      language: 'english',
    });
  });

  it('aggregates posting date warnings on the candidate', () => {
    const candidate = normalizeJob(
      createEnvelope({
        ...hybridPayload,
        posting_date: '2023-02-29',
      }),
    );

    if (candidate === null) {
      throw new Error('Expected an invalid date not to discard the whole record.');
    }

    expect(candidate.postingDate).toBeNull();
    expect(candidate.warnings).toEqual([
      {
        code: 'INVALID_POSTING_DATE',
        field: 'posting_date',
        message: 'Expected a valid calendar date in YYYY-MM-DD format.',
        actualValue: '2023-02-29',
      },
    ]);
  });

  it.each([
    ['null', null],
    ['number', 42],
    ['string', 'invalid'],
    ['array', []],
  ] satisfies ReadonlyArray<readonly [string, unknown]>)(
    'returns null for a non-record %s payload',
    (_caseName, payload) => {
      expect(normalizeJob(createEnvelope(payload))).toBeNull();
    },
  );
});

function createEnvelope(payload: unknown): RawJobEnvelope {
  return {
    id: 'jobs.json:0',
    source: 'jobs.json',
    sourceIndex: 0,
    payload,
  };
}
