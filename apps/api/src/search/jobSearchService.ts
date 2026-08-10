import type { ApprovedJob } from '../models/approvedJob.js';
import type { ApprovedJobRepository } from '../storage/approvedJobRepository.js';
import {
  comparePostingDateAscending,
  comparePostingDateDescending,
} from './postingDateComparator.js';
import { compareSalaryAscending, compareSalaryDescending } from './salaryComparator.js';
import type { JobSort, SearchJobsQuery } from './searchQuery.js';

const DEFAULT_SORT: JobSort = 'posting-date-desc';

type JobComparator = (left: ApprovedJob, right: ApprovedJob) => number;

export interface JobSearchServiceOptions {
  readonly approvedJobs: Pick<ApprovedJobRepository, 'findAll'>;
}

export class JobSearchService {
  readonly #approvedJobs: Pick<ApprovedJobRepository, 'findAll'>;

  constructor(options: JobSearchServiceOptions) {
    this.#approvedJobs = options.approvedJobs;
  }

  async search(query: SearchJobsQuery = {}): Promise<readonly ApprovedJob[]> {
    const titleQuery = query.q?.trim().toLowerCase();
    const jobs = [...(await this.#approvedJobs.findAll())];
    const primaryComparator = selectPrimaryComparator(query.sort ?? DEFAULT_SORT);

    return jobs
      .filter((job) => titleQuery === undefined || job.title.toLowerCase().includes(titleQuery))
      .filter((job) => query.country === undefined || job.location.country === query.country)
      .sort((left, right) => compareJobs(left, right, primaryComparator));
  }
}

function selectPrimaryComparator(sort: JobSort): JobComparator {
  switch (sort) {
    case 'salary-asc':
      return compareSalaryAscending;
    case 'salary-desc':
      return compareSalaryDescending;
    case 'posting-date-asc':
      return comparePostingDateAscending;
    case 'posting-date-desc':
      return comparePostingDateDescending;
    default:
      return unsupportedSort(sort);
  }
}

function compareJobs(
  left: ApprovedJob,
  right: ApprovedJob,
  primaryComparator: JobComparator,
): number {
  return (
    primaryComparator(left, right) ||
    compareStrings(left.title, right.title) ||
    compareStrings(left.id, right.id)
  );
}

function compareStrings(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function unsupportedSort(sort: never): never {
  throw new Error(`Unsupported job sort: ${String(sort)}.`);
}
