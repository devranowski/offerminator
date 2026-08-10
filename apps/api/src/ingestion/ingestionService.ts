import type { ApprovalPolicy } from '../approval/approvalPolicy.js';
import type { ApprovalDecision } from '../models/approvalDecision.js';
import type { NormalizedJobCandidate } from '../models/normalizedJob.js';
import type { RawJobEnvelope } from '../models/rawJob.js';
import type { RejectedJob } from '../models/rejectedJob.js';
import type { RejectionReason } from '../models/rejectionReason.js';
import type { ApprovedJobRepository } from '../storage/approvedJobRepository.js';
import type { RejectedJobRepository } from '../storage/rejectedJobRepository.js';
import type { IngestionSummary, SourceSummary } from './ingestionSummary.js';
import type { JobRejectionLogger } from './jobRejectionLogger.js';
import type { JobSourceLoader, SourceError } from './jobSourceLoader.js';
import { normalizeJob } from './normalizeJob.js';

export interface IngestionServiceOptions {
  readonly sourceLoader: JobSourceLoader;
  readonly sourcePaths: readonly string[];
  readonly approvalPolicy: Pick<ApprovalPolicy, 'evaluate'>;
  readonly approvedJobs: ApprovedJobRepository;
  readonly rejectedJobs: RejectedJobRepository;
  readonly logger: JobRejectionLogger;
}

type RecordOutcome = ApprovalDecision['status'];

export class IngestionService {
  private readonly sourcePaths: readonly string[];
  private lastSummary: IngestionSummary | null = null;

  constructor(private readonly options: IngestionServiceOptions) {
    this.sourcePaths = [...options.sourcePaths];
  }

  async ingestConfiguredSources(): Promise<IngestionSummary> {
    const sourceResults = await this.options.sourceLoader.loadSources(this.sourcePaths);
    const sources: SourceSummary[] = [];
    const sourceErrors: SourceError[] = [];

    for (const result of sourceResults) {
      if (!result.ok) {
        sourceErrors.push(result.error);
        continue;
      }

      sources.push(await this.processSource(result.source, result.records));
    }

    const summary: IngestionSummary = {
      totalSources: sourceResults.length,
      successfulSources: sources.length,
      failedSources: sourceErrors.length,
      totalRecords: sum(sources, 'totalRecords'),
      approved: sum(sources, 'approved'),
      rejected: sum(sources, 'rejected'),
      sources,
      sourceErrors,
    };

    this.lastSummary = summary;

    return summary;
  }

  getLastSummary(): IngestionSummary | null {
    return this.lastSummary;
  }

  private async processSource(source: string, records: readonly unknown[]): Promise<SourceSummary> {
    let approved = 0;
    let rejected = 0;

    for (const [sourceIndex, payload] of records.entries()) {
      const outcome = await this.processEnvelope({
        id: `${source}:${sourceIndex}`,
        source,
        sourceIndex,
        payload,
      });

      if (outcome === 'approved') {
        approved += 1;
      } else {
        rejected += 1;
      }
    }

    return {
      name: source,
      totalRecords: records.length,
      approved,
      rejected,
    };
  }

  private async processEnvelope(envelope: RawJobEnvelope): Promise<RecordOutcome> {
    let candidate: NormalizedJobCandidate | null = null;
    let decision: ApprovalDecision | null;

    try {
      candidate = normalizeJob(envelope);
      decision = candidate === null ? null : this.options.approvalPolicy.evaluate(candidate);
    } catch (error: unknown) {
      return this.reject(
        createRejectedJob(envelope, candidate, [
          {
            code: 'PROCESSING_ERROR',
            field: 'record',
            message: 'Record processing failed unexpectedly.',
          },
        ]),
        { processingError: error },
      );
    }

    if (decision === null) {
      return this.reject(
        createRejectedJob(envelope, null, [
          {
            code: 'INVALID_RECORD_SHAPE',
            field: 'record',
            message: 'Record must be a JSON object.',
          },
        ]),
      );
    }

    if (decision.status === 'approved') {
      await this.options.approvedJobs.save(decision.job);
      return 'approved';
    }

    return this.reject(createRejectedJob(decision.raw, decision.job, decision.reasons));
  }

  private async reject(
    job: RejectedJob,
    diagnostics?: { readonly processingError: unknown },
  ): Promise<'rejected'> {
    await this.options.rejectedJobs.save(job);
    await this.options.logger.logJobRejected({
      event: 'job_rejected',
      jobId: job.id,
      source: job.source,
      sourceIndex: job.sourceIndex,
      reasonCodes: job.reasons.map((reason) => reason.code),
      ...(diagnostics === undefined ? {} : { processingError: diagnostics.processingError }),
    });

    return 'rejected';
  }
}

function createRejectedJob(
  envelope: RawJobEnvelope,
  candidate: NormalizedJobCandidate | null,
  reasons: readonly RejectionReason[],
): RejectedJob {
  return {
    id: envelope.id,
    source: envelope.source,
    sourceIndex: envelope.sourceIndex,
    title: candidate?.title ?? null,
    company: candidate?.company ?? null,
    reasons,
    warnings: candidate?.warnings ?? [],
    raw: envelope.payload,
  };
}

function sum(
  sources: readonly SourceSummary[],
  field: 'totalRecords' | 'approved' | 'rejected',
): number {
  return sources.reduce((total, source) => total + source[field], 0);
}
