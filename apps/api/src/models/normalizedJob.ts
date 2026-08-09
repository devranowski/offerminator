import type { IsoDate } from './isoDate.js';
import type { CompanyType, EmploymentType, JobLanguage } from './jobEnums.js';
import type { JobLocation } from './location.js';
import type { NormalizationWarning } from './normalizationWarning.js';
import type { Salary } from './salary.js';

export interface NormalizedJobCandidate {
  readonly id: string;
  readonly source: string;
  readonly sourceIndex: number;

  readonly title: string | null;
  readonly description: string | null;
  readonly company: string | null;

  readonly location: JobLocation;
  readonly salary: Salary;
  readonly employmentType: EmploymentType;
  readonly companyType: CompanyType;
  readonly language: JobLanguage;
  readonly postingDate: IsoDate | null;

  readonly warnings: readonly NormalizationWarning[];
  readonly raw: unknown;
}
