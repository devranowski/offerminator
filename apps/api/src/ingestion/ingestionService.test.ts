import { describe, expect, it } from 'vitest';

import { ApprovalPolicy, approvalRules } from '../approval/approvalPolicy.js';
import { DefaultCompensationPolicy } from '../approval/compensationPolicy.js';
import { FixedRateCurrencyConverter } from '../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../currency/rates.js';
import type { ApprovedJob } from '../models/approvedJob.js';
import type { ApprovedJobRepository } from '../storage/approvedJobRepository.js';
import { InMemoryApprovedJobRepository } from '../storage/inMemoryApprovedJobRepository.js';
import { InMemoryRejectedJobRepository } from '../storage/inMemoryRejectedJobRepository.js';
import { IngestionService } from './ingestionService.js';
import type { JobRejectedLogEvent, JobRejectionLogger } from './jobRejectionLogger.js';
import type { JobSourceLoader, SourceLoadResult } from './jobSourceLoader.js';

class StaticJobSourceLoader implements JobSourceLoader {
  readonly loadedPaths: string[][] = [];

  constructor(private readonly results: readonly SourceLoadResult[]) {}

  loadSources(paths: readonly string[]): Promise<readonly SourceLoadResult[]> {
    this.loadedPaths.push([...paths]);
    return Promise.resolve(this.results);
  }
}

class RecordingJobRejectionLogger implements JobRejectionLogger {
  readonly events: JobRejectedLogEvent[] = [];

  async logJobRejected(event: JobRejectedLogEvent): Promise<void> {
    await Promise.resolve();
    this.events.push(event);
  }
}

describe('IngestionService', () => {
  it('summarizes successful sources, isolates source errors, and retains the latest summary', async () => {
    const approvedRecord = createRawJob();
    const rejectedRecord = createRawJob({
      employment_type: 'Contract',
      posting_date: 'not-a-date',
    });
    const configuredPaths = ['/input/jobs.json', '/input/broken.json', '/input/extra.json'];
    const sourceLoader = new StaticJobSourceLoader([
      {
        ok: true,
        source: 'jobs.json',
        records: [approvedRecord, null, rejectedRecord],
      },
      {
        ok: false,
        error: {
          source: 'broken.json',
          code: 'INVALID_JSON',
          message: 'Source file does not contain valid JSON.',
        },
      },
      {
        ok: true,
        source: 'extra.json',
        records: [createRawJob({ title: 'Extra One' }), createRawJob({ title: 'Extra Two' })],
      },
    ]);
    const approvedJobs = new InMemoryApprovedJobRepository();
    const rejectedJobs = new InMemoryRejectedJobRepository();
    const logger = new RecordingJobRejectionLogger();
    const service = new IngestionService({
      sourceLoader,
      sourcePaths: configuredPaths,
      approvalPolicy: createApprovalPolicy(),
      approvedJobs,
      rejectedJobs,
      logger,
    });

    configuredPaths.push('/input/added-too-late.json');

    expect(service.getLastSummary()).toBeNull();

    const summary = await service.ingestConfiguredSources();

    expect(sourceLoader.loadedPaths).toEqual([
      ['/input/jobs.json', '/input/broken.json', '/input/extra.json'],
    ]);
    expect(summary).toEqual({
      totalSources: 3,
      successfulSources: 2,
      failedSources: 1,
      totalRecords: 5,
      approved: 3,
      rejected: 2,
      sources: [
        {
          name: 'jobs.json',
          totalRecords: 3,
          approved: 1,
          rejected: 2,
        },
        {
          name: 'extra.json',
          totalRecords: 2,
          approved: 2,
          rejected: 0,
        },
      ],
      sourceErrors: [
        {
          source: 'broken.json',
          code: 'INVALID_JSON',
          message: 'Source file does not contain valid JSON.',
        },
      ],
    });
    expect(service.getLastSummary()).toBe(summary);
    await expect(approvedJobs.findAll()).resolves.toHaveLength(3);

    const storedRejectedJobs = await rejectedJobs.findAll();

    expect(storedRejectedJobs).toHaveLength(2);
    expect(storedRejectedJobs[0]).toEqual({
      id: 'jobs.json:1',
      source: 'jobs.json',
      sourceIndex: 1,
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
      raw: null,
    });
    expect(storedRejectedJobs[1]).toMatchObject({
      id: 'jobs.json:2',
      sourceIndex: 2,
      title: 'Backend Engineer',
      company: 'Example Company',
      reasons: [{ code: 'EMPLOYMENT_TYPE_NOT_FULL_TIME' }],
      warnings: [{ code: 'INVALID_POSTING_DATE', actualValue: 'not-a-date' }],
      raw: rejectedRecord,
    });
    expect(storedRejectedJobs[1]?.raw).toBe(rejectedRecord);
    expect(logger.events.map((event) => event.reasonCodes)).toEqual([
      ['INVALID_RECORD_SHAPE'],
      ['EMPLOYMENT_TYPE_NOT_FULL_TIME'],
    ]);
  });

  it('turns an unexpected record exception into PROCESSING_ERROR and continues the batch', async () => {
    const processingError = new Error('Synthetic approval failure.');
    const failingRecord = createRawJob({
      title: 'Exploding Job',
      company: 'Failure Incorporated',
      posting_date: 'impossible-date',
    });
    const sourceLoader = new StaticJobSourceLoader([
      {
        ok: true,
        source: 'synthetic.json',
        records: [failingRecord, createRawJob({ title: 'Still Processed' })],
      },
    ]);
    const delegate = createApprovalPolicy();
    const approvedJobs = new InMemoryApprovedJobRepository();
    const rejectedJobs = new InMemoryRejectedJobRepository();
    const logger = new RecordingJobRejectionLogger();
    const service = new IngestionService({
      sourceLoader,
      sourcePaths: ['/input/synthetic.json'],
      approvalPolicy: {
        evaluate: (candidate) => {
          if (candidate.sourceIndex === 0) {
            throw processingError;
          }

          return delegate.evaluate(candidate);
        },
      },
      approvedJobs,
      rejectedJobs,
      logger,
    });

    await expect(service.ingestConfiguredSources()).resolves.toMatchObject({
      totalRecords: 2,
      approved: 1,
      rejected: 1,
    });

    const storedRejectedJobs = await rejectedJobs.findAll();

    expect(storedRejectedJobs).toEqual([
      {
        id: 'synthetic.json:0',
        source: 'synthetic.json',
        sourceIndex: 0,
        title: 'Exploding Job',
        company: 'Failure Incorporated',
        reasons: [
          {
            code: 'PROCESSING_ERROR',
            field: 'record',
            message: 'Record processing failed unexpectedly.',
          },
        ],
        warnings: [
          {
            code: 'INVALID_POSTING_DATE',
            field: 'posting_date',
            message: 'Expected a valid calendar date in YYYY-MM-DD format.',
            actualValue: 'impossible-date',
          },
        ],
        raw: failingRecord,
      },
    ]);
    await expect(approvedJobs.findAll()).resolves.toMatchObject([
      { id: 'synthetic.json:1', title: 'Still Processed' },
    ]);
    expect(logger.events).toEqual([
      {
        event: 'job_rejected',
        jobId: 'synthetic.json:0',
        source: 'synthetic.json',
        sourceIndex: 0,
        reasonCodes: ['PROCESSING_ERROR'],
        processingError,
      },
    ]);
  });

  it('preserves record order across asynchronous storage writes', async () => {
    const storageOrder: string[] = [];
    const approvedJobs: ApprovedJobRepository = {
      save: async (job: ApprovedJob): Promise<void> => {
        storageOrder.push(`start:${job.id}`);
        await Promise.resolve();
        storageOrder.push(`end:${job.id}`);
      },
      findAll: () => Promise.resolve([]),
    };
    const service = new IngestionService({
      sourceLoader: new StaticJobSourceLoader([
        {
          ok: true,
          source: 'ordered.json',
          records: [createRawJob({ title: 'First' }), createRawJob({ title: 'Second' })],
        },
      ]),
      sourcePaths: ['/input/ordered.json'],
      approvalPolicy: createApprovalPolicy(),
      approvedJobs,
      rejectedJobs: new InMemoryRejectedJobRepository(),
      logger: new RecordingJobRejectionLogger(),
    });

    await service.ingestConfiguredSources();

    expect(storageOrder).toEqual([
      'start:ordered.json:0',
      'end:ordered.json:0',
      'start:ordered.json:1',
      'end:ordered.json:1',
    ]);
  });

  it('allows only one of two concurrent ingestion calls to run', async () => {
    const sourceLoader = new StaticJobSourceLoader([
      {
        ok: true,
        source: 'concurrent.json',
        records: [createRawJob(), createRawJob({ employment_type: 'Contract' })],
      },
    ]);
    const approvedJobs = new InMemoryApprovedJobRepository();
    const rejectedJobs = new InMemoryRejectedJobRepository();
    const logger = new RecordingJobRejectionLogger();
    const service = new IngestionService({
      sourceLoader,
      sourcePaths: ['/input/configured.json'],
      approvalPolicy: createApprovalPolicy(),
      approvedJobs,
      rejectedJobs,
      logger,
    });

    const [firstRun, secondRun] = await Promise.allSettled([
      service.ingestConfiguredSources(),
      service.ingestConfiguredSources(),
    ]);

    expect(firstRun).toMatchObject({
      status: 'fulfilled',
      value: {
        totalRecords: 2,
        approved: 1,
        rejected: 1,
      },
    });
    expect(secondRun).toEqual({
      status: 'rejected',
      reason: new Error('Ingestion has already been started for this service instance.'),
    });
    if (firstRun.status !== 'fulfilled') {
      throw new Error('Expected the first concurrent ingestion call to succeed.');
    }

    expect(sourceLoader.loadedPaths).toEqual([['/input/configured.json']]);
    await expect(approvedJobs.findAll()).resolves.toHaveLength(1);
    await expect(rejectedJobs.findAll()).resolves.toHaveLength(1);
    expect(logger.events.map((event) => event.reasonCodes)).toEqual([
      ['EMPLOYMENT_TYPE_NOT_FULL_TIME'],
    ]);
    expect(service.getLastSummary()).toBe(firstRun.value);
  });

  it('blocks retry after a first-run storage failure leaves partial state', async () => {
    const storageError = new Error('Synthetic storage failure.');
    const savedJobIds: string[] = [];
    const approvedJobs: ApprovedJobRepository = {
      save: (job) => {
        if (savedJobIds.length === 1) {
          return Promise.reject(storageError);
        }

        savedJobIds.push(job.id);
        return Promise.resolve();
      },
      findAll: () => Promise.resolve([]),
    };
    const sourceLoader = new StaticJobSourceLoader([
      {
        ok: true,
        source: 'storage.json',
        records: [createRawJob(), createRawJob()],
      },
    ]);
    const logger = new RecordingJobRejectionLogger();
    const service = new IngestionService({
      sourceLoader,
      sourcePaths: ['/input/storage.json'],
      approvalPolicy: createApprovalPolicy(),
      approvedJobs,
      rejectedJobs: new InMemoryRejectedJobRepository(),
      logger,
    });

    await expect(service.ingestConfiguredSources()).rejects.toBe(storageError);
    await expect(service.ingestConfiguredSources()).rejects.toThrow(
      'Ingestion has already been started for this service instance.',
    );

    expect(sourceLoader.loadedPaths).toEqual([['/input/storage.json']]);
    expect(savedJobIds).toEqual(['storage.json:0']);
    expect(logger.events).toEqual([]);
    expect(service.getLastSummary()).toBeNull();
  });

  it('awaits asynchronous logging failures and does not publish a summary', async () => {
    const loggingError = new Error('Synthetic logging failure.');
    const rejectedJobs = new InMemoryRejectedJobRepository();
    const service = new IngestionService({
      sourceLoader: new StaticJobSourceLoader([
        {
          ok: true,
          source: 'logging.json',
          records: [createRawJob({ employment_type: 'Contract' })],
        },
      ]),
      sourcePaths: ['/input/logging.json'],
      approvalPolicy: createApprovalPolicy(),
      approvedJobs: new InMemoryApprovedJobRepository(),
      rejectedJobs,
      logger: {
        logJobRejected: () => Promise.reject(loggingError),
      },
    });

    await expect(service.ingestConfiguredSources()).rejects.toBe(loggingError);

    await expect(rejectedJobs.findAll()).resolves.toHaveLength(1);
    expect(service.getLastSummary()).toBeNull();
  });
});

function createApprovalPolicy(): ApprovalPolicy {
  return new ApprovalPolicy({
    rules: approvalRules,
    currencyConverter: new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT),
    compensationPolicy: new DefaultCompensationPolicy(),
  });
}

function createRawJob(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    title: 'Backend Engineer',
    description: 'Build reliable software.',
    company: 'Example Company',
    location: {
      city: 'Austin',
      state: 'TX',
      country: 'USA',
    },
    salary: {
      value: 120_000,
      currency: 'USD',
    },
    employment_type: 'Full-Time',
    posting_date: '2023-10-03',
    company_type: 'Direct Employer',
    language: 'English',
    remote: false,
    ...overrides,
  };
}
