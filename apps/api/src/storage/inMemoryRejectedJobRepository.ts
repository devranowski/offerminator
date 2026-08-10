import type { RejectedJob } from '../models/rejectedJob.js';
import type { RejectedJobRepository } from './rejectedJobRepository.js';

export class InMemoryRejectedJobRepository implements RejectedJobRepository {
  readonly #jobs: RejectedJob[] = [];

  async save(job: RejectedJob): Promise<void> {
    this.#jobs.push(job);
  }

  async findAll(): Promise<readonly RejectedJob[]> {
    return [...this.#jobs];
  }
}
