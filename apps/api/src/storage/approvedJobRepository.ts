import type { ApprovedJob } from '../models/approvedJob.js';

export interface ApprovedJobRepository {
  save(job: ApprovedJob): Promise<void>;
  findAll(): Promise<readonly ApprovedJob[]>;
}
