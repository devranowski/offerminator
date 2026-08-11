import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { IngestionSummary } from './ingestion/ingestionSummary.js';
import { startApplication } from './bootstrap.js';

const completedSummary: IngestionSummary = {
  totalSources: 1,
  successfulSources: 1,
  failedSources: 0,
  totalRecords: 20,
  approved: 10,
  rejected: 10,
  sources: [
    {
      sourceId: 'jobs.json',
      name: 'jobs.json',
      totalRecords: 20,
      approved: 10,
      rejected: 10,
    },
  ],
  sourceErrors: [],
};

describe('application bootstrap', () => {
  it('waits for ingestion to finish before listening', async () => {
    let completeIngestion: ((summary: IngestionSummary) => void) | undefined;
    const ingestionCompletion = new Promise<IngestionSummary>((resolve) => {
      completeIngestion = resolve;
    });
    const ingestConfiguredSources = vi.fn(() => ingestionCompletion);
    const app = Fastify();
    const listen = vi.spyOn(app, 'listen').mockImplementation(() => undefined);

    const startup = startApplication({
      app,
      ingestionService: { ingestConfiguredSources },
      config: { host: '127.0.0.1', port: 3_210 },
    });

    expect(ingestConfiguredSources).toHaveBeenCalledTimes(1);
    expect(listen).not.toHaveBeenCalled();

    if (completeIngestion === undefined) {
      throw new Error('Expected the ingestion completion callback to be initialized.');
    }

    completeIngestion(completedSummary);
    await startup;

    expect(listen).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith({ host: '127.0.0.1', port: 3_210 });
    await app.close();
  });

  it('does not listen when ingestion fails', async () => {
    const ingestionError = new Error('Synthetic ingestion failure.');
    const app = Fastify();
    const listen = vi.spyOn(app, 'listen').mockImplementation(() => undefined);

    await expect(
      startApplication({
        app,
        ingestionService: {
          ingestConfiguredSources: () => Promise.reject(ingestionError),
        },
        config: { host: '127.0.0.1', port: 3_210 },
      }),
    ).rejects.toBe(ingestionError);

    expect(listen).not.toHaveBeenCalled();
    await app.close();
  });
});
