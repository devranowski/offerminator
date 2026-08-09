import type { NormalizationWarning } from './normalizationWarning.js';
import type { RejectionReason } from './rejectionReason.js';

export interface RejectedJob {
  readonly id: string;
  readonly source: string;
  readonly sourceIndex: number;
  readonly title: string | null;
  readonly company: string | null;
  readonly reasons: readonly RejectionReason[];
  readonly warnings: readonly NormalizationWarning[];
  readonly raw: unknown;
}
