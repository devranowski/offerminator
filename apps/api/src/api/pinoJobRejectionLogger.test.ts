import pino from 'pino';
import { describe, expect, it, vi } from 'vitest';

import { PinoJobRejectionLogger } from './pinoJobRejectionLogger.js';

describe('PinoJobRejectionLogger', () => {
  it('writes the structured rejection fields without inventing diagnostics', () => {
    const logger = pino({ enabled: false });
    const info = vi.spyOn(logger, 'info');
    const adapter = new PinoJobRejectionLogger(logger);

    adapter.logJobRejected({
      event: 'job_rejected',
      jobId: 'jobs.json:19',
      source: 'jobs.json',
      sourceIndex: 19,
      reasonCodes: ['TITLE_MISSING', 'STAFFING_FIRM'],
    });

    expect(info).toHaveBeenCalledWith(
      {
        event: 'job_rejected',
        jobId: 'jobs.json:19',
        source: 'jobs.json',
        sourceIndex: 19,
        reasonCodes: ['TITLE_MISSING', 'STAFFING_FIRM'],
      },
      'Job rejected',
    );
  });

  it('reduces processing errors to their type without logging message, stack, or raw value', () => {
    const logger = pino({ enabled: false });
    const info = vi.spyOn(logger, 'info');
    const adapter = new PinoJobRejectionLogger(logger);

    adapter.logJobRejected({
      event: 'job_rejected',
      jobId: 'jobs.json:0',
      source: 'jobs.json',
      sourceIndex: 0,
      reasonCodes: ['PROCESSING_ERROR'],
      processingError: new TypeError('sensitive failure details'),
    });

    expect(info).toHaveBeenCalledWith(
      {
        event: 'job_rejected',
        jobId: 'jobs.json:0',
        source: 'jobs.json',
        sourceIndex: 0,
        reasonCodes: ['PROCESSING_ERROR'],
        processingError: { type: 'TypeError' },
      },
      'Job rejected',
    );
  });

  it('records only the typeof value for a non-Error processing cause', () => {
    const logger = pino({ enabled: false });
    const info = vi.spyOn(logger, 'info');
    const adapter = new PinoJobRejectionLogger(logger);

    adapter.logJobRejected({
      event: 'job_rejected',
      jobId: 'jobs.json:0',
      source: 'jobs.json',
      sourceIndex: 0,
      reasonCodes: ['PROCESSING_ERROR'],
      processingError: 'sensitive raw value',
    });

    expect(info).toHaveBeenCalledWith(
      {
        event: 'job_rejected',
        jobId: 'jobs.json:0',
        source: 'jobs.json',
        sourceIndex: 0,
        reasonCodes: ['PROCESSING_ERROR'],
        processingError: { type: 'string' },
      },
      'Job rejected',
    );
  });
});
