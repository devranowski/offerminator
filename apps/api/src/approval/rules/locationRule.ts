import { isApprovedInPersonCountry } from '../../models/location.js';
import type { ApprovalRule } from '../approvalContext.js';

export const locationRule: ApprovalRule = (job) => {
  const { location } = job;

  if (location.kind === 'remote') {
    return [];
  }

  if (location.kind === 'unknown') {
    return [
      {
        code: 'LOCATION_UNKNOWN',
        field: 'location',
        message: 'Location mode must be known.',
        actualValue: location.kind,
      },
    ];
  }

  if (location.country === null) {
    return [
      {
        code: 'IN_PERSON_COUNTRY_UNKNOWN',
        field: 'location.country',
        message: 'Country is required for an in-person job.',
        actualValue: location.country,
      },
    ];
  }

  if (!isApprovedInPersonCountry(location.country)) {
    return [
      {
        code: 'IN_PERSON_COUNTRY_NOT_ALLOWED',
        field: 'location.country',
        message: 'In-person jobs must be located in the US or Canada.',
        actualValue: location.country,
      },
    ];
  }

  return [];
};
