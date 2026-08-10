import {
  createApprovedJobCompensation,
  type ApprovedJobCompensation,
} from '../models/approvedJob.js';
import type { NormalizedJobCandidate } from '../models/normalizedJob.js';
import type { RejectionReason } from '../models/rejectionReason.js';
import type { CurrencyConverter } from '../currency/currencyConverter.js';
import type { CompensationPolicy } from './compensationPolicy.js';

export type ApprovalRule = (
  job: NormalizedJobCandidate,
  context: ApprovalContext,
) => readonly RejectionReason[];

export class ApprovalContext {
  #approvedJobCompensation: ApprovedJobCompensation | null = null;

  constructor(
    readonly currencyConverter: CurrencyConverter,
    readonly compensationPolicy: CompensationPolicy,
  ) {}

  recordApprovedJobCompensation(salaryUsdCents: number, annualizedSalaryUsdCents: number): void {
    const compensation = createApprovedJobCompensation(salaryUsdCents, annualizedSalaryUsdCents);

    if (compensation === null) {
      throw new Error('Approval invariant violated: compensation must contain safe integers.');
    }

    this.#approvedJobCompensation = compensation;
  }

  getApprovedJobCompensation(): ApprovedJobCompensation | null {
    return this.#approvedJobCompensation;
  }
}
