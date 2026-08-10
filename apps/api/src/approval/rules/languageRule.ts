import { isApprovedLanguageForCountry } from '../../models/languageEligibility.js';
import type { ApprovalRule } from '../approvalContext.js';

export const languageRule: ApprovalRule = (job) => {
  if (job.language === 'unknown') {
    return [
      {
        code: 'LANGUAGE_MISSING',
        field: 'language',
        message: 'Language is required.',
        actualValue: job.language,
      },
    ];
  }

  if (isApprovedLanguageForCountry(job.language, job.location.country)) {
    return [];
  }

  return [
    {
      code: 'LANGUAGE_NOT_ALLOWED',
      field: 'language',
      message: 'Language must be English, or French for jobs in Canada.',
      actualValue: job.language,
    },
  ];
};
