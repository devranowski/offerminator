import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it } from 'vitest';

import { ApprovalPolicy, approvalRules } from '../approval/approvalPolicy.js';
import { DefaultCompensationPolicy } from '../approval/compensationPolicy.js';
import { FixedRateCurrencyConverter } from '../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../currency/rates.js';
import { IngestionService } from '../ingestion/ingestionService.js';
import { FileSystemJobSourceLoader } from '../ingestion/jobSourceLoader.js';
import {
  createApprovedJob,
  createApprovedJobCompensation,
  type ApprovedJob,
} from '../models/approvedJob.js';
import type { CountryCode } from '../models/countryCode.js';
import { createIsoDate, type IsoDate } from '../models/isoDate.js';
import type { ApprovedSalary } from '../models/salary.js';
import type { ApprovedJobRepository } from '../storage/approvedJobRepository.js';
import { InMemoryApprovedJobRepository } from '../storage/inMemoryApprovedJobRepository.js';
import { InMemoryRejectedJobRepository } from '../storage/inMemoryRejectedJobRepository.js';
import {
  createNormalizedJobCandidate,
  requiredCountryCode,
} from '../../test/fixtures/normalizedJobCandidate.js';
import { JobSearchService } from './jobSearchService.js';
import type { JobSort } from './searchQuery.js';

interface TestApprovedJobOptions {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly company?: string;
  readonly country?: CountryCode | null;
  readonly salary?: ApprovedSalary;
  readonly postingDate?: IsoDate | null;
  readonly salaryUsdCents?: number;
  readonly annualizedSalaryUsdCents?: number;
}

const defaultFixtureOrder = [
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
] as const;

let fixtureSearchService: JobSearchService;

beforeAll(async () => {
  const approvedJobs = new InMemoryApprovedJobRepository();
  const ingestionService = new IngestionService({
    sourceLoader: new FileSystemJobSourceLoader(),
    sourcePaths: [fileURLToPath(new URL('../../../../data/jobs.json', import.meta.url))],
    approvalPolicy: new ApprovalPolicy({
      rules: approvalRules,
      currencyConverter: new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT),
      compensationPolicy: new DefaultCompensationPolicy(),
    }),
    approvedJobs,
    rejectedJobs: new InMemoryRejectedJobRepository(),
    logger: { logJobRejected: () => undefined },
  });

  await ingestionService.ingestConfiguredSources();
  fixtureSearchService = new JobSearchService({ approvedJobs });
});

describe('JobSearchService', () => {
  it('returns every approved fixture job in the default date-descending order', async () => {
    const results = await fixtureSearchService.search();

    expect(jobTitles(results)).toEqual(defaultFixtureOrder);
  });

  it('trims a case-insensitive title query and treats a blank query as unfiltered', async () => {
    const matchingJobs = await fixtureSearchService.search({ q: '  EnGiNeEr  ' });
    const unfilteredJobs = await fixtureSearchService.search({ q: '   ' });

    expect(jobTitles(matchingJobs)).toEqual([
      'QA Automation Engineer',
      'Machine Learning Engineer',
      'Backend Engineer',
      'Senior Software Engineer',
    ]);
    expect(jobTitles(unfilteredJobs)).toEqual(defaultFixtureOrder);
  });

  it('searches only the title, not company or description', async () => {
    const titleMatch = createTestApprovedJob({
      id: 'title:0',
      title: 'Needle Operator',
    });
    const companyOnlyMatch = createTestApprovedJob({
      id: 'title:1',
      title: 'Product Manager',
      company: 'Needle Incorporated',
    });
    const descriptionOnlyMatch = createTestApprovedJob({
      id: 'title:2',
      title: 'Account Executive',
      description: 'Own the needle product line.',
    });
    const service = createSearchService([companyOnlyMatch, descriptionOnlyMatch, titleMatch]);

    const results = await service.search({ q: 'NeEdLe' });

    expect(jobTitles(results)).toEqual(['Needle Operator']);
  });

  it('filters the approved fixture by normalized country with exact counts', async () => {
    const [usJobs, caJobs, gbJobs, deJobs] = await Promise.all([
      fixtureSearchService.search({ country: requiredCountryCode('US') }),
      fixtureSearchService.search({ country: requiredCountryCode('CA') }),
      fixtureSearchService.search({ country: requiredCountryCode('GB') }),
      fixtureSearchService.search({ country: requiredCountryCode('DE') }),
    ]);

    expect(jobTitles(usJobs)).toEqual([
      'Cybersecurity Specialist',
      'Product Analyst',
      'UX Designer',
      'QA Automation Engineer',
      'Backend Engineer',
      'Senior Software Engineer',
      'Growth Marketing Manager',
    ]);
    expect(jobTitles(caJobs)).toEqual(['Customer Success Manager', 'Machine Learning Engineer']);
    expect(
      gbJobs.map((job) => ({
        title: job.title,
        locationKind: job.location.kind,
        country: job.location.country,
      })),
    ).toEqual([
      {
        title: 'Agile Project Lead',
        locationKind: 'remote',
        country: 'GB',
      },
    ]);
    expect(deJobs).toEqual([]);
    expect(usJobs.length + caJobs.length + gbJobs.length).toBe(10);
  });

  it('does not match a remote approved job without country metadata to a country filter', async () => {
    const countrylessJob = createTestApprovedJob({
      id: 'country:null',
      title: 'Countryless Remote Job',
      country: null,
    });
    const usJob = createTestApprovedJob({
      id: 'country:us',
      title: 'US Remote Job',
      country: requiredCountryCode('US'),
    });
    const service = createSearchService([countrylessJob, usJob]);

    const results = await service.search({ country: requiredCountryCode('US') });

    expect(jobIds(results)).toEqual(['country:us']);
  });

  it('combines title and country filters before applying the requested sort', async () => {
    const results = await fixtureSearchService.search({
      q: ' engineer ',
      country: requiredCountryCode('US'),
      sort: 'salary-desc',
    });

    expect(jobTitles(results)).toEqual([
      'Senior Software Engineer',
      'Backend Engineer',
      'QA Automation Engineer',
    ]);
  });

  it('sorts fixture jobs by annualized salary in both directions', async () => {
    const ascending = await fixtureSearchService.search({ sort: 'salary-asc' });
    const descending = await fixtureSearchService.search({ sort: 'salary-desc' });

    expect(jobTitles(ascending)).toEqual([
      'UX Designer',
      'Agile Project Lead',
      'Customer Success Manager',
      'QA Automation Engineer',
      'Machine Learning Engineer',
      'Product Analyst',
      'Growth Marketing Manager',
      'Cybersecurity Specialist',
      'Backend Engineer',
      'Senior Software Engineer',
    ]);
    expect(jobTitles(descending)).toEqual([
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
    ]);
  });

  it('places an hourly job by its precomputed annualized salary', async () => {
    const annual120 = createTestApprovedJob({
      id: 'salary:annual-120',
      title: 'Annual 120',
      salary: annualSalary(120_000),
      salaryUsdCents: 12_000_000,
      annualizedSalaryUsdCents: 12_000_000,
    });
    const hourly60 = createTestApprovedJob({
      id: 'salary:hourly-60',
      title: 'Hourly 60',
      salary: hourlySalary(60),
      salaryUsdCents: 6_000,
      annualizedSalaryUsdCents: 12_480_000,
    });
    const annual135 = createTestApprovedJob({
      id: 'salary:annual-135',
      title: 'Annual 135',
      salary: annualSalary(135_000),
      salaryUsdCents: 13_500_000,
      annualizedSalaryUsdCents: 13_500_000,
    });
    const service = createSearchService([annual135, hourly60, annual120]);

    const ascending = await service.search({ sort: 'salary-asc' });
    const descending = await service.search({ sort: 'salary-desc' });

    expect(jobTitles(ascending)).toEqual(['Annual 120', 'Hourly 60', 'Annual 135']);
    expect(jobTitles(descending)).toEqual(['Annual 135', 'Hourly 60', 'Annual 120']);
  });

  it('sorts posting dates in both directions with null always last', async () => {
    const ascending = await fixtureSearchService.search({ sort: 'posting-date-asc' });
    const descending = await fixtureSearchService.search({ sort: 'posting-date-desc' });

    expect(jobTitles(ascending)).toEqual([
      'Senior Software Engineer',
      'Backend Engineer',
      'Machine Learning Engineer',
      'Agile Project Lead',
      'QA Automation Engineer',
      'UX Designer',
      'Product Analyst',
      'Cybersecurity Specialist',
      'Customer Success Manager',
      'Growth Marketing Manager',
    ]);
    expect(jobTitles(descending)).toEqual(defaultFixtureOrder);
  });

  it('uses title and then id as deterministic tie-breakers, including between null dates', async () => {
    const commonDate = requiredIsoDate('2024-01-01');
    const jobs = [
      createTieJob('tie:c', 'Beta', commonDate),
      createTieJob('tie:b', 'Alpha', commonDate),
      createTieJob('null:c', 'Epsilon', null),
      createTieJob('tie:a', 'Alpha', commonDate),
      createTieJob('null:b', 'Delta', null),
      createTieJob('null:a', 'Delta', null),
    ];
    const service = createSearchService(jobs);
    const expectedTieOrder = ['tie:a', 'tie:b', 'tie:c', 'null:a', 'null:b', 'null:c'];

    for (const sort of ['salary-asc', 'salary-desc'] satisfies readonly JobSort[]) {
      expect(jobIds(await service.search({ sort }))).toEqual(expectedTieOrder);
    }

    for (const sort of ['posting-date-asc', 'posting-date-desc'] satisfies readonly JobSort[]) {
      expect(jobIds(await service.search({ sort }))).toEqual(expectedTieOrder);
    }
  });

  it('does not mutate the collection returned by the repository', async () => {
    const highest = createTestApprovedJob({
      id: 'mutation:high',
      title: 'Highest',
      salaryUsdCents: 13_000_000,
      annualizedSalaryUsdCents: 13_000_000,
    });
    const lowest = createTestApprovedJob({
      id: 'mutation:low',
      title: 'Lowest',
      salaryUsdCents: 11_000_000,
      annualizedSalaryUsdCents: 11_000_000,
    });
    const middle = createTestApprovedJob({
      id: 'mutation:middle',
      title: 'Middle',
      salaryUsdCents: 12_000_000,
      annualizedSalaryUsdCents: 12_000_000,
    });
    const repositoryCollection = [highest, lowest, middle];
    const service = createSearchService(repositoryCollection);

    const results = await service.search({ sort: 'salary-asc' });

    expect(jobIds(results)).toEqual(['mutation:low', 'mutation:middle', 'mutation:high']);
    expect(jobIds(repositoryCollection)).toEqual([
      'mutation:high',
      'mutation:low',
      'mutation:middle',
    ]);
    expect(results).not.toBe(repositoryCollection);
  });
});

function createTestApprovedJob(options: TestApprovedJobOptions): ApprovedJob {
  const salaryUsdCents = options.salaryUsdCents ?? 12_000_000;
  const annualizedSalaryUsdCents = options.annualizedSalaryUsdCents ?? salaryUsdCents;
  const compensation = createApprovedJobCompensation(salaryUsdCents, annualizedSalaryUsdCents);

  if (compensation === null) {
    throw new Error('Expected synthetic test compensation to be valid.');
  }

  const job = createApprovedJob(
    createNormalizedJobCandidate({
      id: options.id,
      title: options.title,
      description: options.description ?? 'Build reliable software.',
      company: options.company ?? 'Example Company',
      location: {
        kind: 'remote',
        city: null,
        region: null,
        country: options.country === undefined ? requiredCountryCode('US') : options.country,
        raw: 'Remote',
      },
      salary: options.salary ?? annualSalary(salaryUsdCents / 100),
      postingDate: options.postingDate ?? null,
    }),
    compensation,
  );

  if (job === null) {
    throw new Error('Expected synthetic test job to be approved.');
  }

  return job;
}

function createTieJob(id: string, title: string, postingDate: IsoDate | null): ApprovedJob {
  return createTestApprovedJob({ id, title, postingDate });
}

function createSearchService(jobs: readonly ApprovedJob[]): JobSearchService {
  const approvedJobs: Pick<ApprovedJobRepository, 'findAll'> = {
    findAll: () => Promise.resolve(jobs),
  };

  return new JobSearchService({ approvedJobs });
}

function annualSalary(amount: number): ApprovedSalary {
  return {
    kind: 'annual',
    amount,
    currency: 'USD',
    source: 'explicit',
  };
}

function hourlySalary(amount: number): ApprovedSalary {
  return {
    kind: 'hourly',
    amount,
    currency: 'USD',
    source: 'explicit',
  };
}

function requiredIsoDate(value: string): IsoDate {
  const date = createIsoDate(value);

  if (date === null) {
    throw new Error(`Expected ${value} to be a valid ISO date.`);
  }

  return date;
}

function jobTitles(jobs: readonly ApprovedJob[]): string[] {
  return jobs.map((job) => job.title);
}

function jobIds(jobs: readonly ApprovedJob[]): string[] {
  return jobs.map((job) => job.id);
}
