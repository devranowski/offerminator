import type { ApprovedJob } from './approvedJob.js';
import type { NormalizedJobCandidate } from './normalizedJob.js';
import type { RawJobEnvelope } from './rawJob.js';
import type { RejectionReason } from './rejectionReason.js';

export type ApprovalDecision =
  | {
      readonly status: 'approved';
      readonly job: ApprovedJob;
    }
  | {
      readonly status: 'rejected';
      readonly job: NormalizedJobCandidate | null;
      readonly raw: RawJobEnvelope;
      readonly reasons: readonly RejectionReason[];
    };
