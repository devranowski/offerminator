import type { NormalizedJobCandidate } from '../models/normalizedJob.js';
import type { ApprovedSalary } from '../models/salary.js';

export type ThresholdOperator = 'gt' | 'gte';

export interface CompensationThreshold {
  readonly amountUsdCents: number;
  readonly operator: ThresholdOperator;
}

export interface CompensationPolicy {
  getThreshold(
    job: NormalizedJobCandidate,
    salaryKind: ApprovedSalary['kind'],
  ): CompensationThreshold;
}

const DEFAULT_THRESHOLDS = {
  annual: {
    amountUsdCents: 10_000_000,
    operator: 'gt',
  },
  hourly: {
    amountUsdCents: 4_500,
    operator: 'gt',
  },
} as const satisfies Record<ApprovedSalary['kind'], CompensationThreshold>;

export class DefaultCompensationPolicy implements CompensationPolicy {
  getThreshold(
    _job: NormalizedJobCandidate,
    salaryKind: ApprovedSalary['kind'],
  ): CompensationThreshold {
    return DEFAULT_THRESHOLDS[salaryKind];
  }
}

export function meetsCompensationThreshold(
  amountUsdCents: number,
  threshold: CompensationThreshold,
): boolean {
  return threshold.operator === 'gt'
    ? amountUsdCents > threshold.amountUsdCents
    : amountUsdCents >= threshold.amountUsdCents;
}
