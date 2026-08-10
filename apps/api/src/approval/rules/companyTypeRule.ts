import type { ApprovalRule } from '../approvalContext.js';

export const companyTypeRule: ApprovalRule = (job) => {
  if (job.companyType === 'direct-employer' || job.companyType === 'consulting-agency') {
    return [];
  }

  if (job.companyType === 'unknown') {
    return [
      {
        code: 'COMPANY_TYPE_UNKNOWN',
        field: 'company_type',
        message: 'Company type must be known.',
        actualValue: job.companyType,
      },
    ];
  }

  return [
    {
      code: 'STAFFING_FIRM',
      field: 'company_type',
      message: 'Staffing firms are not allowed.',
      actualValue: job.companyType,
    },
  ];
};
