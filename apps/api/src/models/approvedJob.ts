import type { IsoDate } from './isoDate.js';
import type { ApprovedCompanyType, ApprovedLanguage } from './jobEnums.js';
import type { ApprovedLocation } from './location.js';
import type { NonEmptyString } from './nonEmptyString.js';
import type { ApprovedSalary } from './salary.js';

declare const approvedJobBrand: unique symbol;

export interface ApprovedJob {
  readonly [approvedJobBrand]: 'ApprovedJob';

  readonly id: string;
  readonly title: NonEmptyString;
  readonly description: string | null;
  readonly company: string | null;

  readonly location: ApprovedLocation;
  readonly salary: ApprovedSalary;

  readonly employmentType: 'full-time';
  readonly companyType: ApprovedCompanyType;
  readonly language: ApprovedLanguage;

  readonly postingDate: IsoDate | null;

  readonly salaryUsdCents: number;
  readonly annualizedSalaryUsdCents: number;
}
