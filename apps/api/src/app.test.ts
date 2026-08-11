import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  IngestionSummaryDto,
  JobDto,
  JobsResponseDto,
  RejectedJobsResponseDto,
} from '@offerminator/api-contracts';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildApp } from './app.js';
import { createDependencies, type ApplicationDependencies } from './bootstrap.js';
import type { RejectedJob } from './models/rejectedJob.js';

interface ApiTestContext {
  readonly app: FastifyInstance;
  readonly dependencies: ApplicationDependencies;
}

interface ErrorResponse {
  readonly statusCode: number;
  readonly error: string;
  readonly message: string;
}

const defaultJobOrder = [
  'Customer Success Manager',
  'Cybersecurity Specialist',
  'Product Analyst',
  'UX Designer',
  'QA Automation Engineer',
  'Agile Project Lead',
  'Machine Learning Engineer',
  'Backend Engineer',
  'Senior Software Engineer',
  'Growth Marketing Manager',
];

const salaryDescendingOrder = [
  'Senior Software Engineer',
  'Backend Engineer',
  'Cybersecurity Specialist',
  'Growth Marketing Manager',
  'Machine Learning Engineer',
  'Product Analyst',
  'Customer Success Manager',
  'QA Automation Engineer',
  'Agile Project Lead',
  'UX Designer',
];

const countryCases = [
  { country: 'US', total: 7 },
  { country: 'CA', total: 2 },
  { country: 'GB', total: 1 },
  { country: 'DE', total: 0 },
];

const invalidQueryCases = [
  '/api/jobs?country=invalid',
  '/api/jobs?country=123',
  '/api/jobs?country=ZZ',
  '/api/jobs?country=u%C5%BF',
  '/api/jobs?sort=invalid',
];

let testContext: ApiTestContext | null = null;

beforeAll(async () => {
  const dependencies = createDependencies(
    { host: '127.0.0.1', port: 3_000 },
    { logJobRejected: () => undefined },
  );
  const app = await buildApp(dependencies);

  await dependencies.ingestionService.ingestConfiguredSources();
  testContext = { app, dependencies };
});

afterAll(async () => {
  if (testContext !== null) {
    await testContext.app.close();
  }
});

describe('Fastify API', () => {
  it('reports health without opening a network port', async () => {
    const response = await context().app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ readonly status: string }>()).toEqual({ status: 'ok' });
  });

  it('serves built frontend assets only when a frontend root is configured', async () => {
    const responseWithoutFrontend = await context().app.inject({ method: 'GET', url: '/' });
    const frontendRoot = await mkdtemp(join(tmpdir(), 'offerminator-frontend-'));
    const assetsRoot = join(frontendRoot, 'assets');

    await mkdir(assetsRoot);
    await Promise.all([
      writeFile(join(frontendRoot, 'index.html'), '<main id="root">Offerminator</main>'),
      writeFile(join(assetsRoot, 'app-a1b2c3.js'), 'globalThis.offerminator = true;'),
    ]);

    const app = await buildApp(
      {
        searchService: { search: () => Promise.resolve([]) },
        rejectedJobs: { findAll: () => Promise.resolve([]) },
        ingestionService: { getLastSummary: () => null },
      },
      { frontendRoot },
    );

    try {
      const [indexResponse, indexPathResponse, assetResponse, healthResponse, unknownResponse] =
        await Promise.all([
          app.inject({ method: 'GET', url: '/' }),
          app.inject({ method: 'GET', url: '/index.html' }),
          app.inject({ method: 'GET', url: '/assets/app-a1b2c3.js' }),
          app.inject({ method: 'GET', url: '/api/health' }),
          app.inject({ method: 'GET', url: '/unknown' }),
        ]);

      expect(responseWithoutFrontend.statusCode).toBe(404);
      expect(indexResponse.statusCode).toBe(200);
      expect(indexResponse.body).toBe('<main id="root">Offerminator</main>');
      expect(indexResponse.headers['cache-control']).toBe('public, max-age=0');
      expect(indexPathResponse.statusCode).toBe(200);
      expect(indexPathResponse.headers['cache-control']).toBe('public, max-age=0');
      expect(assetResponse.statusCode).toBe(200);
      expect(assetResponse.headers['cache-control']).toBe('public, max-age=31536000, immutable');
      expect(healthResponse.statusCode).toBe(200);
      expect(healthResponse.json<{ readonly status: string }>()).toEqual({ status: 'ok' });
      expect(unknownResponse.statusCode).toBe(404);
    } finally {
      await app.close();
      await rm(frontendRoot, { recursive: true, force: true });
    }
  });

  it('returns every approved job in the default order and maps a job without domain leakage', async () => {
    const response = await context().app.inject({ method: 'GET', url: '/api/jobs' });
    const body = response.json<JobsResponseDto>();

    expect(response.statusCode).toBe(200);
    expect(body.total).toBe(10);
    expect(body.items).toHaveLength(10);
    expect(jobTitles(body.items)).toEqual(defaultJobOrder);
    expect(body.items.find((job) => job.id === 'jobs.json:0')).toEqual({
      id: 'jobs.json:0',
      title: 'Backend Engineer',
      company: 'NextGen Systems',
      description:
        'Join our backend team to build scalable APIs using Go and microservices architecture.',
      location: {
        kind: 'in-person',
        city: 'Austin',
        region: 'TX',
        country: 'US',
      },
      salary: {
        amount: 145_000,
        currency: 'USD',
        period: 'annual',
        usdEquivalent: 145_000,
        annualizedUsd: 145_000,
      },
      postingDate: '2023-10-03',
    });
  });

  it('searches case-insensitively and treats a blank query as no filter', async () => {
    const [matchingResponse, blankResponse] = await Promise.all([
      context().app.inject({ method: 'GET', url: '/api/jobs?q=EnGiNeEr' }),
      context().app.inject({ method: 'GET', url: '/api/jobs?q=%20%20%20' }),
    ]);
    const matching = matchingResponse.json<JobsResponseDto>();
    const blank = blankResponse.json<JobsResponseDto>();

    expect(matchingResponse.statusCode).toBe(200);
    expect(matching.total).toBe(4);
    expect(jobTitles(matching.items)).toEqual([
      'QA Automation Engineer',
      'Machine Learning Engineer',
      'Backend Engineer',
      'Senior Software Engineer',
    ]);
    expect(blankResponse.statusCode).toBe(200);
    expect(blank.total).toBe(10);
    expect(jobTitles(blank.items)).toEqual(defaultJobOrder);
  });

  it.each(countryCases)(
    'filters country=$country to exactly $total jobs',
    async ({ country, total }) => {
      const response = await context().app.inject({
        method: 'GET',
        url: `/api/jobs?country=${country}`,
      });
      const body = response.json<JobsResponseDto>();

      expect(response.statusCode).toBe(200);
      expect(body.total).toBe(total);
      expect(body.items).toHaveLength(total);
    },
  );

  it('normalizes a lowercase country and preserves remote country metadata', async () => {
    const [uppercaseResponse, lowercaseResponse, gbResponse, deResponse] = await Promise.all([
      context().app.inject({ method: 'GET', url: '/api/jobs?country=CA' }),
      context().app.inject({ method: 'GET', url: '/api/jobs?country=ca' }),
      context().app.inject({ method: 'GET', url: '/api/jobs?country=GB' }),
      context().app.inject({ method: 'GET', url: '/api/jobs?country=DE' }),
    ]);
    const uppercase = uppercaseResponse.json<JobsResponseDto>();
    const lowercase = lowercaseResponse.json<JobsResponseDto>();
    const gb = gbResponse.json<JobsResponseDto>();
    const de = deResponse.json<JobsResponseDto>();

    expect(lowercaseResponse.statusCode).toBe(200);
    expect(lowercase.total).toBe(2);
    expect(jobIds(lowercase.items)).toEqual(jobIds(uppercase.items));
    expect(gb).toEqual({
      total: 1,
      items: [
        {
          id: 'jobs.json:3',
          title: 'Agile Project Lead',
          company: 'Orbit Global',
          description:
            'Drive cross-functional teams in a remote-first environment with agile principles.',
          location: {
            kind: 'remote',
            city: 'Manchester',
            region: 'England',
            country: 'GB',
          },
          salary: {
            amount: 85_000,
            currency: 'GBP',
            period: 'annual',
            usdEquivalent: 106_250,
            annualizedUsd: 106_250,
          },
          postingDate: '2023-10-13',
        },
      ],
    });
    expect(deResponse.statusCode).toBe(200);
    expect(de).toEqual({ items: [], total: 0 });
  });

  it('sorts salary descending using annualized USD values', async () => {
    const response = await context().app.inject({
      method: 'GET',
      url: '/api/jobs?sort=salary-desc',
    });
    const body = response.json<JobsResponseDto>();

    expect(response.statusCode).toBe(200);
    expect(jobTitles(body.items)).toEqual(salaryDescendingOrder);
  });

  it('combines title and country filters before sorting', async () => {
    const response = await context().app.inject({
      method: 'GET',
      url: '/api/jobs?q=engineer&country=US&sort=salary-desc',
    });
    const body = response.json<JobsResponseDto>();

    expect(response.statusCode).toBe(200);
    expect(body.total).toBe(3);
    expect(jobTitles(body.items)).toEqual([
      'Senior Software Engineer',
      'Backend Engineer',
      'QA Automation Engineer',
    ]);
  });

  it('rejects invalid country and sort queries before invoking search', async () => {
    const search = vi.fn(() => Promise.resolve([]));
    const app = await buildApp({
      searchService: { search },
      rejectedJobs: { findAll: () => Promise.resolve([]) },
      ingestionService: { getLastSummary: () => null },
    });

    for (const url of invalidQueryCases) {
      const response = await app.inject({ method: 'GET', url });

      expect(response.statusCode).toBe(400);
      expect(response.json<ErrorResponse>()).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid query parameters.',
      });
    }

    expect(search).not.toHaveBeenCalled();
    await app.close();
  });

  it('returns all rejected records with selected reason details and the raw OpsFlex payload', async () => {
    const response = await context().app.inject({ method: 'GET', url: '/api/rejected-jobs' });
    const body = response.json<RejectedJobsResponseDto>();

    expect(response.statusCode).toBe(200);
    expect(body.total).toBe(10);
    expect(body.items).toHaveLength(10);
    expect(body.items.find((job) => job.id === 'jobs.json:19')).toEqual({
      id: 'jobs.json:19',
      sourceId: 'jobs.json',
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
        {
          code: 'EMPLOYMENT_TYPE_NOT_FULL_TIME',
          field: 'employment_type',
          message: 'Employment type must be full-time.',
        },
        {
          code: 'HOURLY_SALARY_BELOW_THRESHOLD',
          field: 'salary',
          message: 'Hourly salary does not meet the required threshold.',
        },
        {
          code: 'STAFFING_FIRM',
          field: 'company_type',
          message: 'Staffing firms are not allowed.',
        },
      ],
      raw: {
        title: '',
        description: 'Temporary support role.',
        company: 'OpsFlex',
        location: null,
        salary: {
          value: 40,
          currency: 'USD',
          unit: 'hourly',
        },
        employment_type: 'Contract',
        posting_date: '2023-10-24',
        company_type: 'Staffing Firm',
        language: 'English',
        remote: true,
      },
      rawPreviewTruncated: false,
    });
  });

  it('serializes a bounded rejected-job preview for deeply nested valid JSON', async () => {
    const nestingDepth = 10_000;
    const json = `${'{"nested":'.repeat(nestingDepth)}"leaf"${'}'.repeat(nestingDepth)}`;
    const raw: unknown = JSON.parse(json);
    const rejectedJob: RejectedJob = {
      id: 'synthetic:deep',
      sourceId: 'synthetic',
      source: 'synthetic.json',
      sourceIndex: 0,
      title: null,
      company: null,
      reasons: [
        {
          code: 'INVALID_RECORD_SHAPE',
          field: 'record',
          message: 'Record must be a JSON object.',
        },
      ],
      warnings: [],
      raw,
    };
    const app = await buildApp({
      searchService: { search: () => Promise.resolve([]) },
      rejectedJobs: { findAll: () => Promise.resolve([rejectedJob]) },
      ingestionService: { getLastSummary: () => null },
    });

    const response = await app.inject({ method: 'GET', url: '/api/rejected-jobs' });
    const body = response.json<RejectedJobsResponseDto>();

    expect(response.statusCode).toBe(200);
    expect(body.total).toBe(1);
    expect(body.items[0]?.rawPreviewTruncated).toBe(true);
    expect(JSON.stringify(body.items[0]?.raw)).toContain('[Raw preview truncated]');
    await app.close();
  });

  it('keeps endpoint totals consistent with the completed ingestion summary', async () => {
    const [jobsResponse, rejectedResponse, summaryResponse] = await Promise.all([
      context().app.inject({ method: 'GET', url: '/api/jobs' }),
      context().app.inject({ method: 'GET', url: '/api/rejected-jobs' }),
      context().app.inject({ method: 'GET', url: '/api/ingestion-summary' }),
    ]);
    const jobs = jobsResponse.json<JobsResponseDto>();
    const rejected = rejectedResponse.json<RejectedJobsResponseDto>();
    const summary = summaryResponse.json<IngestionSummaryDto>();

    expect(summaryResponse.statusCode).toBe(200);
    expect(summary).toEqual({
      totalSources: 1,
      successfulSources: 1,
      failedSources: 0,
      totalRecords: 20,
      approved: 10,
      rejected: 10,
      sources: [
        {
          sourceId: 'jobs.json',
          name: 'jobs.json',
          totalRecords: 20,
          approved: 10,
          rejected: 10,
        },
      ],
      sourceErrors: [],
    });
    expect(jobs.total).toBe(summary.approved);
    expect(jobs.items).toHaveLength(summary.approved);
    expect(rejected.total).toBe(summary.rejected);
    expect(rejected.items).toHaveLength(summary.rejected);
    expect(jobs.total + rejected.total).toBe(summary.totalRecords);
  });

  it('reports a missing summary as an invariant failure without triggering ingestion', async () => {
    const ingestConfiguredSources = vi.fn(() => Promise.resolve(createEmptySummary()));
    const ingestionService = {
      getLastSummary: () => null,
      ingestConfiguredSources,
    };
    const app = await buildApp({
      searchService: { search: () => Promise.resolve([]) },
      rejectedJobs: { findAll: () => Promise.resolve([]) },
      ingestionService,
    });

    const response = await app.inject({ method: 'GET', url: '/api/ingestion-summary' });

    expect(response.statusCode).toBe(500);
    expect(response.json<ErrorResponse>()).toEqual({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred.',
    });
    expect(ingestConfiguredSources).not.toHaveBeenCalled();
    await app.close();
  });
});

function context(): ApiTestContext {
  if (testContext === null) {
    throw new Error('Expected API test context to be initialized.');
  }

  return testContext;
}

function jobTitles(jobs: readonly JobDto[]): string[] {
  return jobs.map((job) => job.title);
}

function jobIds(jobs: readonly JobDto[]): string[] {
  return jobs.map((job) => job.id);
}

function createEmptySummary(): IngestionSummaryDto {
  return {
    totalSources: 0,
    successfulSources: 0,
    failedSources: 0,
    totalRecords: 0,
    approved: 0,
    rejected: 0,
    sources: [],
    sourceErrors: [],
  };
}
