import type { ApprovedJob } from '../models/approvedJob.js';
import type { ApprovedJobRepository } from './approvedJobRepository.js';

export class InMemoryApprovedJobRepository implements ApprovedJobRepository {
  readonly #jobs: ApprovedJob[] = [];

  async save(job: ApprovedJob): Promise<void> {
    this.#jobs.push(job);
  }

  async findAll(): Promise<readonly ApprovedJob[]> {
    return [...this.#jobs];
  }
}
