import type { CurrencyConverter } from '../currency/currencyConverter.js';
import type { ApprovalDecision } from '../models/approvalDecision.js';
import { createApprovedJob } from '../models/approvedJob.js';
import type { NormalizedJobCandidate } from '../models/normalizedJob.js';
import type { RawJobEnvelope } from '../models/rawJob.js';
import { ApprovalContext, type ApprovalRule } from './approvalContext.js';
import type { CompensationPolicy } from './compensationPolicy.js';
import { companyTypeRule } from './rules/companyTypeRule.js';
import { employmentTypeRule } from './rules/employmentTypeRule.js';
import { languageRule } from './rules/languageRule.js';
import { locationRule } from './rules/locationRule.js';
import { salaryRule } from './rules/salaryRule.js';
import { titleRule } from './rules/titleRule.js';

export const approvalRules: readonly ApprovalRule[] = [
  titleRule,
  locationRule,
  employmentTypeRule,
  salaryRule,
  companyTypeRule,
  languageRule,
];

export interface ApprovalPolicyOptions {
  readonly rules: readonly ApprovalRule[];
  readonly currencyConverter: CurrencyConverter;
  readonly compensationPolicy: CompensationPolicy;
}

export class ApprovalPolicy {
  constructor(private readonly options: ApprovalPolicyOptions) {}

  evaluate(job: NormalizedJobCandidate): ApprovalDecision {
    const context = new ApprovalContext(
      this.options.currencyConverter,
      this.options.compensationPolicy,
    );
    const reasons = this.options.rules.flatMap((rule) => rule(job, context));

    if (reasons.length > 0) {
      return {
        status: 'rejected',
        job,
        raw: toRawJobEnvelope(job),
        reasons,
      };
    }

    const compensation = context.getApprovedJobCompensation();

    if (compensation === null) {
      throw new Error('Approval invariant violated: compensation was not recorded.');
    }

    const approvedJob = createApprovedJob(job, compensation);

    if (approvedJob === null) {
      throw new Error('Approval invariant violated: approved job construction failed.');
    }

    return {
      status: 'approved',
      job: approvedJob,
    };
  }
}

function toRawJobEnvelope(job: NormalizedJobCandidate): RawJobEnvelope {
  return {
    id: job.id,
    source: job.source,
    sourceIndex: job.sourceIndex,
    payload: job.raw,
  };
}
