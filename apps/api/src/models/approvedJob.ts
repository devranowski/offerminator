import type { IsoDate } from './isoDate.js';
import type { ApprovedCompanyType, ApprovedLanguage } from './jobEnums.js';
import { isApprovedLanguageForCountry } from './languageEligibility.js';
import { isApprovedInPersonCountry, type ApprovedLocation, type JobLocation } from './location.js';
import { createNonEmptyString, type NonEmptyString } from './nonEmptyString.js';
import type { NormalizedJobCandidate } from './normalizedJob.js';
import type { ApprovedSalary } from './salary.js';

declare const approvedJobBrand: unique symbol;
declare const approvedJobCompensationBrand: unique symbol;

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

export interface ApprovedJobCompensation {
  readonly [approvedJobCompensationBrand]: 'ApprovedJobCompensation';
  readonly salaryUsdCents: number;
  readonly annualizedSalaryUsdCents: number;
}

function createApprovedJobCompensation(
  salaryUsdCents: number,
  annualizedSalaryUsdCents: number,
): ApprovedJobCompensation | null {
  if (!Number.isSafeInteger(salaryUsdCents) || !Number.isSafeInteger(annualizedSalaryUsdCents)) {
    return null;
  }

  const compensation = {
    salaryUsdCents,
    annualizedSalaryUsdCents,
  } satisfies Omit<ApprovedJobCompensation, typeof approvedJobCompensationBrand>;

  return compensation as ApprovedJobCompensation;
}

function createApprovedJob(
  job: NormalizedJobCandidate,
  compensation: ApprovedJobCompensation,
): ApprovedJob | null {
  const title = job.title === null ? null : createNonEmptyString(job.title.trim());
  const location = toApprovedLocation(job.location);

  if (
    title === null ||
    location === null ||
    job.salary.kind === 'unknown' ||
    job.employmentType !== 'full-time' ||
    (job.companyType !== 'direct-employer' && job.companyType !== 'consulting-agency') ||
    !isApprovedLanguageForCountry(job.language, location.country)
  ) {
    return null;
  }

  const approvedJob = {
    id: job.id,
    title,
    description: job.description,
    company: job.company,
    location,
    salary: job.salary,
    employmentType: job.employmentType,
    companyType: job.companyType,
    language: job.language,
    postingDate: job.postingDate,
    salaryUsdCents: compensation.salaryUsdCents,
    annualizedSalaryUsdCents: compensation.annualizedSalaryUsdCents,
  } satisfies Omit<ApprovedJob, typeof approvedJobBrand>;

  return approvedJob as ApprovedJob;
}

function toApprovedLocation(location: JobLocation): ApprovedLocation | null {
  if (location.kind === 'remote') {
    return location;
  }

  const country = location.country;

  if (location.kind !== 'in-person' || country === null || !isApprovedInPersonCountry(country)) {
    return null;
  }

  return { ...location, country };
}

export { createApprovedJob, createApprovedJobCompensation };
