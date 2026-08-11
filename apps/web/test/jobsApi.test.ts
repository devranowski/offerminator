import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchApprovedJobs,
  fetchIngestionSummary,
  type ApprovedJobsQuery,
} from '../src/api/jobsApi.js';

const DEFAULT_QUERY: ApprovedJobsQuery = {
  q: '',
  country: '',
  sort: 'posting-date-desc',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('jobs API client response validation', () => {
  it('rejects a successful approved-jobs response with an invalid body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(createJsonResponse({ items: [], total: 'not-a-number' })),
    );

    await expect(fetchApprovedJobs(DEFAULT_QUERY)).rejects.toThrow();
  });

  it('rejects a successful approved-jobs response with an invalid posting date', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          items: [
            {
              id: 'synthetic:invalid-date',
              title: 'Invalid Date Engineer',
              company: null,
              description: null,
              location: {
                kind: 'remote',
                city: null,
                region: null,
                country: 'US',
              },
              salary: {
                amount: 120_000,
                currency: 'USD',
                period: 'annual',
                usdEquivalent: 120_000,
                annualizedUsd: 120_000,
              },
              postingDate: 'not-a-date',
            },
          ],
          total: 1,
        }),
      ),
    );

    await expect(fetchApprovedJobs(DEFAULT_QUERY)).rejects.toThrow();
  });

  it('rejects a successful ingestion-summary response with an invalid body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          totalSources: 1,
          successfulSources: 1,
          failedSources: 0,
          totalRecords: 20,
          approved: 10,
          rejected: 10,
          sources: [],
          sourceErrors: 'not-an-array',
        }),
      ),
    );

    await expect(fetchIngestionSummary()).rejects.toThrow();
  });
});

function createJsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
