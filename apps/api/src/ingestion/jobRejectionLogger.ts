import type { RejectionCode } from '../models/rejectionReason.js';

export interface JobRejectedLogEvent {
  readonly event: 'job_rejected';
  readonly jobId: string;
  readonly source: string;
  readonly sourceIndex: number;
  readonly reasonCodes: readonly RejectionCode[];
  readonly processingError?: unknown;
}

export interface JobRejectionLogger {
  logJobRejected(event: JobRejectedLogEvent): void | Promise<void>;
}
