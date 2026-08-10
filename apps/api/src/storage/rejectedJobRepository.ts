import type { RejectedJob } from '../models/rejectedJob.js';

export interface RejectedJobRepository {
  save(job: RejectedJob): Promise<void>;
  findAll(): Promise<readonly RejectedJob[]>;
}
