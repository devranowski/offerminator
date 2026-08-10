import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ApprovalPolicy, approvalRules } from '../approval/approvalPolicy.js';
import { DefaultCompensationPolicy } from '../approval/compensationPolicy.js';
import { FixedRateCurrencyConverter } from '../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../currency/rates.js';
import type { RejectionCode } from '../models/rejectionReason.js';
import { InMemoryApprovedJobRepository } from '../storage/inMemoryApprovedJobRepository.js';
import { InMemoryRejectedJobRepository } from '../storage/inMemoryRejectedJobRepository.js';
import { IngestionService } from './ingestionService.js';
import type { JobRejectedLogEvent, JobRejectionLogger } from './jobRejectionLogger.js';
import { FileSystemJobSourceLoader } from './jobSourceLoader.js';

const expectedApprovedTitles = [
  'Backend Engineer',
  'Machine Learning Engineer',
  'Agile Project Lead',
  'Senior Software Engineer',
  'QA Automation Engineer',
  'UX Designer',
  'Product Analyst',
  'Cybersecurity Specialist',
  'Growth Marketing Manager',
  'Customer Success Manager',
] as const;

const expectedRejectedCodes = new Map<number, readonly RejectionCode[]>([
  [1, ['EMPLOYMENT_TYPE_NOT_FULL_TIME', 'ANNUAL_SALARY_BELOW_THRESHOLD', 'STAFFING_FIRM']],
  [4, ['EMPLOYMENT_TYPE_NOT_FULL_TIME']],
  [6, ['ANNUAL_SALARY_BELOW_THRESHOLD', 'STAFFING_FIRM', 'LANGUAGE_MISSING']],
  [7, ['ANNUAL_SALARY_BELOW_THRESHOLD']],
  [8, ['ANNUAL_SALARY_BELOW_THRESHOLD']],
  [12, ['IN_PERSON_COUNTRY_NOT_ALLOWED', 'ANNUAL_SALARY_BELOW_THRESHOLD', 'LANGUAGE_NOT_ALLOWED']],
  [13, ['EMPLOYMENT_TYPE_NOT_FULL_TIME', 'ANNUAL_SALARY_BELOW_THRESHOLD']],
  [16, ['EMPLOYMENT_TYPE_NOT_FULL_TIME', 'STAFFING_FIRM']],
  [17, ['ANNUAL_SALARY_BELOW_THRESHOLD']],
  [
    19,
    [
      'TITLE_MISSING',
      'EMPLOYMENT_TYPE_NOT_FULL_TIME',
      'HOURLY_SALARY_BELOW_THRESHOLD',
      'STAFFING_FIRM',
    ],
  ],
]);

describe('full ingestion pipeline', () => {
  it('loads, normalizes, evaluates, stores, and logs all 20 fixture records', async () => {
    const approvedJobs = new InMemoryApprovedJobRepository();
    const rejectedJobs = new InMemoryRejectedJobRepository();
    const logger = new RecordingJobRejectionLogger();
    const fixturePath = fileURLToPath(new URL('../../../../data/jobs.json', import.meta.url));
    const service = new IngestionService({
      sourceLoader: new FileSystemJobSourceLoader(),
      sourcePaths: [fixturePath],
      approvalPolicy: new ApprovalPolicy({
        rules: approvalRules,
        currencyConverter: new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT),
        compensationPolicy: new DefaultCompensationPolicy(),
      }),
      approvedJobs,
      rejectedJobs,
      logger,
    });

    const summary = await service.ingestConfiguredSources();
    const approved = await approvedJobs.findAll();
    const rejected = await rejectedJobs.findAll();

    expect(summary).toEqual({
      totalSources: 1,
      successfulSources: 1,
      failedSources: 0,
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
      sourceErrors: [],
    });
    expect(approved.map((job) => job.title)).toEqual(expectedApprovedTitles);
    expect(rejected).toHaveLength(expectedRejectedCodes.size);
    expect(rejected.map((job) => job.sourceIndex)).toEqual([...expectedRejectedCodes.keys()]);

    for (const job of rejected) {
      const expectedCodes = expectedRejectedCodes.get(job.sourceIndex);

      if (expectedCodes === undefined) {
        throw new Error(`Unexpected rejected fixture record ${job.sourceIndex}.`);
      }

      const actualCodes = job.reasons.map((reason) => reason.code);

      expect(actualCodes).toHaveLength(expectedCodes.length);
      expect(new Set(actualCodes)).toEqual(new Set(expectedCodes));
    }

    expect(rejected.flatMap((job) => job.reasons.map((reason) => reason.code))).not.toContain(
      'SALARY_INVALID',
    );

    const maximumSalaryUsdCents = Math.max(...approved.map((job) => job.salaryUsdCents));
    const maximumAnnualizedSalaryUsdCents = Math.max(
      ...approved.map((job) => job.annualizedSalaryUsdCents),
    );

    expect(maximumSalaryUsdCents).toBe(15_000_000);
    expect(maximumAnnualizedSalaryUsdCents).toBe(15_000_000);
    expect(approved.find((job) => job.salaryUsdCents === maximumSalaryUsdCents)?.title).toBe(
      'Senior Software Engineer',
    );
    expect(
      approved.find((job) => job.annualizedSalaryUsdCents === maximumAnnualizedSalaryUsdCents)
        ?.title,
    ).toBe('Senior Software Engineer');
    expect(Number.MAX_SAFE_INTEGER - maximumSalaryUsdCents).toBe(9_007_199_239_740_991);
    expect(Number.MAX_SAFE_INTEGER - maximumAnnualizedSalaryUsdCents).toBe(9_007_199_239_740_991);

    expect(logger.events).toHaveLength(10);
    expect(logger.events.find((event) => event.sourceIndex === 19)).toEqual({
      event: 'job_rejected',
      jobId: 'jobs.json:19',
      source: 'jobs.json',
      sourceIndex: 19,
      reasonCodes: [
        'TITLE_MISSING',
        'EMPLOYMENT_TYPE_NOT_FULL_TIME',
        'HOURLY_SALARY_BELOW_THRESHOLD',
        'STAFFING_FIRM',
      ],
    });
  });
});

class RecordingJobRejectionLogger implements JobRejectionLogger {
  readonly events: JobRejectedLogEvent[] = [];

  logJobRejected(event: JobRejectedLogEvent): void {
    this.events.push(event);
  }
}
