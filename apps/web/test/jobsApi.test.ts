import { rawJobPreviewMaxDepth } from '@offerminator/api-contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fetchApprovedJobs,
  fetchIngestionSummary,
  fetchRejectedJobs,
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

  it('rejects a successful approved-jobs response with a mismatched total', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({ items: [], total: 1 })));

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

  it('rejects a successful rejected-jobs response with an invalid body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          items: [
            {
              id: 'jobs.json:19',
              sourceId: 'jobs.json',
              title: null,
              company: 'OpsFlex',
              source: 'jobs.json',
              sourceIndex: 19,
              reasons: [{ code: 'NOT_A_REJECTION_CODE', field: 'title', message: 'Invalid.' }],
              raw: {},
              rawPreviewTruncated: false,
            },
          ],
          total: 1,
        }),
      ),
    );

    await expect(fetchRejectedJobs()).rejects.toThrow();
  });

  it('rejects a successful rejected-jobs response with a mismatched total', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createJsonResponse({ items: [], total: 1 })));

    await expect(fetchRejectedJobs()).rejects.toThrow();
  });

  it('rejects a raw preview that exceeds the shared transport depth', async () => {
    let raw: unknown = 'leaf';

    for (let depth = 0; depth <= rawJobPreviewMaxDepth; depth += 1) {
      raw = { nested: raw };
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        createJsonResponse({
          items: [
            {
              id: 'jobs.json:19',
              sourceId: 'jobs.json',
              title: null,
              company: 'OpsFlex',
              source: 'jobs.json',
              sourceIndex: 19,
              reasons: [
                { code: 'TITLE_MISSING', field: 'title', message: 'Title must not be empty.' },
              ],
              raw,
              rawPreviewTruncated: true,
            },
          ],
          total: 1,
        }),
      ),
    );

    await expect(fetchRejectedJobs()).rejects.toThrow();
  });
});

function createJsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
