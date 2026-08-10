import type { ApprovedJob } from '../models/approvedJob.js';

function compareSalaryAscending(left: ApprovedJob, right: ApprovedJob): number {
  return compareNumbers(left.annualizedSalaryUsdCents, right.annualizedSalaryUsdCents);
}

function compareSalaryDescending(left: ApprovedJob, right: ApprovedJob): number {
  return compareNumbers(right.annualizedSalaryUsdCents, left.annualizedSalaryUsdCents);
}

function compareNumbers(left: number, right: number): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

export { compareSalaryAscending, compareSalaryDescending };
