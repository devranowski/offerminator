import type { ApprovedJob } from '../models/approvedJob.js';
import type { IsoDate } from '../models/isoDate.js';

function comparePostingDateAscending(left: ApprovedJob, right: ApprovedJob): number {
  return comparePostingDates(left.postingDate, right.postingDate, compareStrings);
}

function comparePostingDateDescending(left: ApprovedJob, right: ApprovedJob): number {
  return comparePostingDates(left.postingDate, right.postingDate, (leftDate, rightDate) =>
    compareStrings(rightDate, leftDate),
  );
}

function comparePostingDates(
  left: IsoDate | null,
  right: IsoDate | null,
  comparePresentDates: (leftDate: IsoDate, rightDate: IsoDate) => number,
): number {
  if (left === null) {
    return right === null ? 0 : 1;
  }

  if (right === null) {
    return -1;
  }

  return comparePresentDates(left, right);
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

export { comparePostingDateAscending, comparePostingDateDescending };
