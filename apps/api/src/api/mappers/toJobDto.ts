import type { JobDto } from '@offerminator/api-contracts';

import type { ApprovedJob } from '../../models/approvedJob.js';

export function toJobDto(job: ApprovedJob): JobDto {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    description: job.description,
    location: {
      kind: job.location.kind,
      city: job.location.city,
      region: job.location.region,
      country: job.location.country,
    },
    salary: {
      amount: job.salary.amount,
      currency: job.salary.currency,
      period: job.salary.kind,
      usdEquivalent: job.salaryUsdCents / 100,
      annualizedUsd: job.annualizedSalaryUsdCents / 100,
    },
    postingDate: job.postingDate,
  };
}
