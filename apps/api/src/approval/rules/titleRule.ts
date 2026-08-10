import type { ApprovalRule } from '../approvalContext.js';

const titleRule: ApprovalRule = (job) => {
  if (job.title !== null && job.title.trim().length > 0) {
    return [];
  }

  return [
    {
      code: 'TITLE_MISSING',
      field: 'title',
      message: 'Title must not be empty.',
      actualValue: job.title,
    },
  ];
};

export { titleRule };
