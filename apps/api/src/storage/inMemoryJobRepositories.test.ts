import { describe, expect, it } from 'vitest';

import {
  createApprovedJob,
  createApprovedJobCompensation,
  type ApprovedJob,
} from '../models/approvedJob.js';
import type { RejectedJob } from '../models/rejectedJob.js';
import { createNormalizedJobCandidate } from '../../test/fixtures/normalizedJobCandidate.js';
import { InMemoryApprovedJobRepository } from './inMemoryApprovedJobRepository.js';
import { InMemoryRejectedJobRepository } from './inMemoryRejectedJobRepository.js';

describe('in-memory job repositories', () => {
  it('preserves approved-job insertion order and returns a fresh collection', async () => {
    const repository = new InMemoryApprovedJobRepository();
    const firstJob = createTestApprovedJob('approved:0', 'Backend Engineer');
    const secondJob = createTestApprovedJob('approved:1', 'Platform Engineer');

    await repository.save(firstJob);
    await repository.save(secondJob);

    const firstRead = await repository.findAll();
    const secondRead = await repository.findAll();

    expect(firstRead).toEqual([firstJob, secondJob]);
    expect(secondRead).toEqual(firstRead);
    expect(secondRead).not.toBe(firstRead);
  });

  it('preserves rejected-job insertion order and returns a fresh collection', async () => {
    const repository = new InMemoryRejectedJobRepository();
    const firstJob = createTestRejectedJob('rejected:0', 0);
    const secondJob = createTestRejectedJob('rejected:1', 1);

    await repository.save(firstJob);
    await repository.save(secondJob);

    const firstRead = await repository.findAll();
    const secondRead = await repository.findAll();

    expect(firstRead).toEqual([firstJob, secondJob]);
    expect(secondRead).toEqual(firstRead);
    expect(secondRead).not.toBe(firstRead);
  });
});

function createTestApprovedJob(id: string, title: string): ApprovedJob {
  const compensation = createApprovedJobCompensation(12_000_000, 12_000_000);

  if (compensation === null) {
    throw new Error('Expected test compensation to be valid.');
  }

  const job = createApprovedJob(createNormalizedJobCandidate({ id, title }), compensation);

  if (job === null) {
    throw new Error('Expected test approved job to be valid.');
  }

  return job;
}

function createTestRejectedJob(id: string, sourceIndex: number): RejectedJob {
  return {
    id,
    sourceId: 'test',
    source: 'test.json',
    sourceIndex,
    title: null,
    company: 'Example Company',
    reasons: [
      {
        code: 'TITLE_MISSING',
        field: 'title',
        message: 'A non-empty title is required.',
      },
    ],
    warnings: [],
    raw: {},
  };
}
