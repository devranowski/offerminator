import type { ApprovalRule } from '../approvalContext.js';

const employmentTypeRule: ApprovalRule = (job) => {
  if (job.employmentType === 'full-time') {
    return [];
  }

  if (job.employmentType === 'unknown') {
    return [
      {
        code: 'EMPLOYMENT_TYPE_UNKNOWN',
        field: 'employment_type',
        message: 'Employment type must be known.',
        actualValue: job.employmentType,
      },
    ];
  }

  return [
    {
      code: 'EMPLOYMENT_TYPE_NOT_FULL_TIME',
      field: 'employment_type',
      message: 'Employment type must be full-time.',
      actualValue: job.employmentType,
    },
  ];
};

export { employmentTypeRule };
