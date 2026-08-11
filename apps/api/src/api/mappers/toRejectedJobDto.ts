import type { RejectedJobDto } from '@offerminator/api-contracts';

import type { RejectedJob } from '../../models/rejectedJob.js';
import { createRawJobPreview } from './rawJobPreview.js';

function toRejectedJobDto(job: RejectedJob): RejectedJobDto {
  const rawPreview = createRawJobPreview(job.raw);

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
    raw: rawPreview.value,
    rawPreviewTruncated: rawPreview.truncated,
  };
}

export { toRejectedJobDto };
