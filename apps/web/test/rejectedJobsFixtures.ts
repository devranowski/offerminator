import type {
  RejectedJobDto,
  RejectedJobsResponseDto,
  RejectionReasonDto,
} from '@offerminator/api-contracts';

interface RejectedJobFixtureRow {
  readonly sourceIndex: number;
  readonly title: string | null;
  readonly company: string;
  readonly reasons: readonly RejectionReasonDto[];
}

const employmentTypeReason: RejectionReasonDto = {
  code: 'EMPLOYMENT_TYPE_NOT_FULL_TIME',
  field: 'employment_type',
  message: 'Employment type must be full-time.',
};

const annualSalaryReason: RejectionReasonDto = {
  code: 'ANNUAL_SALARY_BELOW_THRESHOLD',
  field: 'salary',
  message: 'Annual salary does not meet the required threshold.',
};

const staffingFirmReason: RejectionReasonDto = {
  code: 'STAFFING_FIRM',
  field: 'company_type',
  message: 'Staffing firms are not allowed.',
};

const rejectedJobRows: readonly RejectedJobFixtureRow[] = [
  {
    sourceIndex: 1,
    title: 'Frontend Developer Intern',
    company: 'BrightStart Talent',
    reasons: [employmentTypeReason, annualSalaryReason, staffingFirmReason],
  },
  {
    sourceIndex: 4,
    title: 'DevOps Consultant',
    company: 'CloudWorks Pro',
    reasons: [employmentTypeReason],
  },
  {
    sourceIndex: 6,
    title: 'Junior Developer',
    company: 'Staffing Solutions',
    reasons: [
      annualSalaryReason,
      staffingFirmReason,
      {
        code: 'LANGUAGE_MISSING',
        field: 'language',
        message: 'Language is required.',
      },
    ],
  },
  {
    sourceIndex: 7,
    title: 'Data Scientist',
    company: 'Analytics Corp.',
    reasons: [annualSalaryReason],
  },
  {
    sourceIndex: 8,
    title: 'Project Manager',
    company: 'Global Enterprises',
    reasons: [annualSalaryReason],
  },
  {
    sourceIndex: 12,
    title: 'Mobile Engineer',
    company: 'AppForge',
    reasons: [
      {
        code: 'IN_PERSON_COUNTRY_NOT_ALLOWED',
        field: 'location.country',
        message: 'In-person jobs must be located in the US or Canada.',
      },
      annualSalaryReason,
      {
        code: 'LANGUAGE_NOT_ALLOWED',
        field: 'language',
        message: 'Language must be English, or French for jobs in Canada.',
      },
    ],
  },
  {
    sourceIndex: 13,
    title: 'Technical Writer',
    company: 'DocuFlow',
    reasons: [employmentTypeReason, annualSalaryReason],
  },
  {
    sourceIndex: 16,
    title: 'Database Administrator',
    company: 'DataCore Services',
    reasons: [employmentTypeReason, staffingFirmReason],
  },
  {
    sourceIndex: 17,
    title: 'Business Operations Associate',
    company: 'Northstar Group',
    reasons: [annualSalaryReason],
  },
  {
    sourceIndex: 19,
    title: null,
    company: 'OpsFlex',
    reasons: [
      {
        code: 'TITLE_MISSING',
        field: 'title',
        message: 'Title must not be empty.',
      },
      employmentTypeReason,
      {
        code: 'HOURLY_SALARY_BELOW_THRESHOLD',
        field: 'salary',
        message: 'Hourly salary does not meet the required threshold.',
      },
      staffingFirmReason,
    ],
  },
];

const opsFlexRaw = {
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
};

const rejectedJobs: readonly RejectedJobDto[] = rejectedJobRows.map((row) => ({
  id: `jobs.json:${row.sourceIndex}`,
  title: row.title,
  company: row.company,
  source: 'jobs.json',
  sourceIndex: row.sourceIndex,
  reasons: row.reasons,
  raw: row.sourceIndex === 19 ? opsFlexRaw : { sourceIndex: row.sourceIndex },
}));

const fullRejectedJobsResponse: RejectedJobsResponseDto = {
  items: rejectedJobs,
  total: rejectedJobs.length,
};

export { fullRejectedJobsResponse };
