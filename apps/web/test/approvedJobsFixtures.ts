import type {
  IngestionSummaryDto,
  JobDto,
  JobLocationDto,
  JobSalaryDto,
  JobsResponseDto,
} from '@offerminator/api-contracts';

interface AnnualJobFixtureRow {
  readonly sourceIndex: number;
  readonly title: string;
  readonly company: string;
  readonly description: string;
  readonly location: JobLocationDto;
  readonly salary: JobSalaryDto;
  readonly postingDate: string | null;
}

const annualJobFixtureRows: readonly AnnualJobFixtureRow[] = [
  {
    sourceIndex: 18,
    title: 'Customer Success Manager',
    company: 'ClientBridge',
    description: 'Help customers onboard.',
    location: inPersonLocation('Toronto', 'ON', 'CA'),
    salary: annualSalary(110_000),
    postingDate: '2023-10-23',
  },
  {
    sourceIndex: 14,
    title: 'Cybersecurity Specialist',
    company: 'SecurePath',
    description: 'Monitor security events.',
    location: inPersonLocation('Washington', 'DC', 'US'),
    salary: annualSalary(135_000),
    postingDate: '2023-10-20',
  },
  {
    sourceIndex: 11,
    title: 'Product Analyst',
    company: 'MetricMind',
    description: 'Analyze product usage data.',
    location: inPersonLocation('Boston', 'MA', 'US'),
    salary: annualSalary(120_000),
    postingDate: '2023-10-17',
  },
  {
    sourceIndex: 10,
    title: 'UX Designer',
    company: 'PixelCraft Studio',
    description: 'Design intuitive user experiences.',
    location: inPersonLocation(null, 'CA', 'US'),
    salary: annualSalary(105_000),
    postingDate: '2023-10-16',
  },
  {
    sourceIndex: 9,
    title: 'QA Automation Engineer',
    company: 'QualityLoop',
    description: 'Build automated test suites.',
    location: remoteLocation('Chicago', 'IL', 'US'),
    salary: annualSalary(110_000),
    postingDate: '2023-10-15',
  },
  {
    sourceIndex: 3,
    title: 'Agile Project Lead',
    company: 'Orbit Global',
    description: 'Drive cross-functional teams in a remote-first environment.',
    location: remoteLocation('Manchester', 'England', 'GB'),
    salary: annualSalary(85_000, 'GBP', 106_250),
    postingDate: '2023-10-13',
  },
  {
    sourceIndex: 2,
    title: 'Machine Learning Engineer',
    company: 'DeepData Labs',
    description: 'Develop advanced machine learning models.',
    location: inPersonLocation('Montreal', 'QC', 'CA'),
    salary: annualSalary(120_000),
    postingDate: '2023-10-11',
  },
  {
    sourceIndex: 0,
    title: 'Backend Engineer',
    company: 'NextGen Systems',
    description: 'Build scalable APIs.',
    location: inPersonLocation('Austin', 'TX', 'US'),
    salary: annualSalary(145_000),
    postingDate: '2023-10-03',
  },
  {
    sourceIndex: 5,
    title: 'Senior Software Engineer',
    company: 'Tech Innovators Inc.',
    description: 'Build software systems.',
    location: inPersonLocation('New York', 'NY', 'US'),
    salary: annualSalary(150_000),
    postingDate: '2023-10-01',
  },
  {
    sourceIndex: 15,
    title: 'Growth Marketing Manager',
    company: 'ScaleRocket',
    description: 'Own acquisition campaigns.',
    location: remoteLocation('San Francisco', 'CA', 'US'),
    salary: annualSalary(125_000),
    postingDate: null,
  },
];

const approvedJobs: readonly JobDto[] = annualJobFixtureRows.map(createAnnualJob);

const nullableJob: JobDto = {
  id: 'synthetic:null-fields',
  title: 'Null Fields Specialist',
  company: null,
  description: null,
  location: {
    kind: 'in-person',
    city: null,
    region: null,
    country: null,
  },
  salary: {
    amount: 120_000,
    currency: 'USD',
    period: 'annual',
    usdEquivalent: 120_000,
    annualizedUsd: 120_000,
  },
  postingDate: null,
};

const hourlyJob: JobDto = {
  id: 'synthetic:hourly',
  title: 'Hourly Systems Engineer',
  company: 'Hourly Labs',
  description: 'Maintain distributed systems.',
  location: {
    kind: 'remote',
    city: null,
    region: null,
    country: 'US',
  },
  salary: {
    amount: 60,
    currency: 'USD',
    period: 'hourly',
    usdEquivalent: 60,
    annualizedUsd: 124_800,
  },
  postingDate: '2023-10-24',
};

const fullJobsResponse: JobsResponseDto = {
  items: approvedJobs,
  total: approvedJobs.length,
};

const jobsByCountry: Readonly<Record<'CA' | 'DE' | 'GB' | 'US', JobsResponseDto>> = {
  CA: jobsResponseForTitles(['Customer Success Manager', 'Machine Learning Engineer']),
  DE: jobsResponseForTitles([]),
  GB: jobsResponseForTitles(['Agile Project Lead']),
  US: jobsResponseForTitles([
    'Cybersecurity Specialist',
    'Product Analyst',
    'UX Designer',
    'QA Automation Engineer',
    'Backend Engineer',
    'Senior Software Engineer',
    'Growth Marketing Manager',
  ]),
};

const ingestionSummary: IngestionSummaryDto = {
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
};

function createAnnualJob(row: AnnualJobFixtureRow): JobDto {
  return {
    id: `jobs.json:${row.sourceIndex}`,
    title: row.title,
    company: row.company,
    description: row.description,
    location: row.location,
    salary: row.salary,
    postingDate: row.postingDate,
  };
}

function annualSalary(amount: number, currency = 'USD', usdEquivalent = amount): JobSalaryDto {
  return {
    amount,
    currency,
    period: 'annual',
    usdEquivalent,
    annualizedUsd: usdEquivalent,
  };
}

function inPersonLocation(
  city: string | null,
  region: string | null,
  country: string | null,
): JobLocationDto {
  return { kind: 'in-person', city, region, country };
}

function remoteLocation(
  city: string | null,
  region: string | null,
  country: string | null,
): JobLocationDto {
  return { kind: 'remote', city, region, country };
}

function jobsResponseForTitles(titles: readonly string[]): JobsResponseDto {
  const items = titles.map((title) => {
    const job = approvedJobs.find((candidate) => candidate.title === title);

    if (job === undefined) {
      throw new Error(`Approved jobs fixture has no job titled "${title}".`);
    }

    return job;
  });

  return { items, total: items.length };
}

export { fullJobsResponse, hourlyJob, ingestionSummary, jobsByCountry, nullableJob };
