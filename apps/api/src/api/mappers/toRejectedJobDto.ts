import type { RejectedJobDto } from '@offerminator/api-contracts';

import type { RejectedJob } from '../../models/rejectedJob.js';

export function toRejectedJobDto(job: RejectedJob): RejectedJobDto {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    source: job.source,
    sourceIndex: job.sourceIndex,
    reasons: job.reasons.map((reason) => ({
      code: reason.code,
      field: reason.field,
      message: reason.message,
    })),
    raw: job.raw,
  };
}
