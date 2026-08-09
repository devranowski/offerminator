import type { CompanyType, EmploymentType, JobLanguage } from '../models/jobEnums.js';
import { normalizeOptionalString } from './normalizeString.js';

export function normalizeEmploymentType(value: unknown): EmploymentType {
  switch (normalizeEnumValue(value)) {
    case 'full-time':
      return 'full-time';
    case 'part-time':
      return 'part-time';
    case 'contract':
      return 'contract';
    case 'internship':
      return 'internship';
    default:
      return 'unknown';
  }
}

export function normalizeCompanyType(value: unknown): CompanyType {
  switch (normalizeEnumValue(value)) {
    case 'direct employer':
      return 'direct-employer';
    case 'consulting agency':
      return 'consulting-agency';
    case 'staffing firm':
      return 'staffing-firm';
    default:
      return 'unknown';
  }
}

export function normalizeLanguage(value: unknown): JobLanguage {
  const normalized = normalizeEnumValue(value);

  if (normalized === null) {
    return 'unknown';
  }

  switch (normalized) {
    case 'english':
      return 'english';
    case 'french':
      return 'french';
    default:
      return 'other';
  }
}

function normalizeEnumValue(value: unknown): string | null {
  return normalizeOptionalString(value)?.toLowerCase() ?? null;
}
