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

  if (job.language === 'english' || (job.language === 'french' && job.location.country === 'CA')) {
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
