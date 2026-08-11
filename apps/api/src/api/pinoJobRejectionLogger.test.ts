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
      sourceId: 'jobs.json',
      source: 'jobs.json',
      sourceIndex: 19,
      reasonCodes: ['TITLE_MISSING', 'STAFFING_FIRM'],
    });

    expect(info).toHaveBeenCalledWith(
      {
        event: 'job_rejected',
        jobId: 'jobs.json:19',
        sourceId: 'jobs.json',
        source: 'jobs.json',
        sourceIndex: 19,
        reasonCodes: ['TITLE_MISSING', 'STAFFING_FIRM'],
      },
      'Job rejected',
    );
    expect(info.mock.calls[0]?.[0]).not.toHaveProperty('processingError');
  });

  it('logs only the name and message from an Error', () => {
    const logger = pino({ enabled: false });
    const info = vi.spyOn(logger, 'info');
    const adapter = new PinoJobRejectionLogger(logger);
    const processingError = Object.assign(
      new TypeError('diagnostic failure details', {
        cause: new Error('sensitive cause'),
      }),
      { secretContext: 'sensitive enumerable property' },
    );
    processingError.stack = 'sensitive stack';

    adapter.logJobRejected({
      event: 'job_rejected',
      jobId: 'jobs.json:0',
      sourceId: 'jobs.json',
      source: 'jobs.json',
      sourceIndex: 0,
      reasonCodes: ['PROCESSING_ERROR'],
      processingError,
    });

    expect(info).toHaveBeenCalledWith(
      {
        event: 'job_rejected',
        jobId: 'jobs.json:0',
        sourceId: 'jobs.json',
        source: 'jobs.json',
        sourceIndex: 0,
        reasonCodes: ['PROCESSING_ERROR'],
        processingError: {
          name: 'TypeError',
          message: 'diagnostic failure details',
        },
      },
      'Job rejected',
    );
    const loggedFields = info.mock.calls[0]?.[0];
    expect(loggedFields).not.toHaveProperty('processingError.stack');
    expect(loggedFields).not.toHaveProperty('processingError.cause');
    expect(loggedFields).not.toHaveProperty('processingError.secretContext');
    expect(loggedFields).not.toHaveProperty('processingError', processingError);
  });

  it.each([
    {
      label: 'string',
      processingError: 'sensitive raw value',
      expectedType: 'string',
    },
    {
      label: 'object',
      processingError: { message: 'sensitive object contents' },
      expectedType: 'object',
    },
    {
      label: 'null',
      processingError: null,
      expectedType: 'object',
    },
  ])('logs only typeof for a non-Error $label cause', ({ processingError, expectedType }) => {
    const logger = pino({ enabled: false });
    const info = vi.spyOn(logger, 'info');
    const adapter = new PinoJobRejectionLogger(logger);

    adapter.logJobRejected({
      event: 'job_rejected',
      jobId: 'jobs.json:0',
      sourceId: 'jobs.json',
      source: 'jobs.json',
      sourceIndex: 0,
      reasonCodes: ['PROCESSING_ERROR'],
      processingError,
    });

    expect(info).toHaveBeenCalledWith(
      {
        event: 'job_rejected',
        jobId: 'jobs.json:0',
        sourceId: 'jobs.json',
        source: 'jobs.json',
        sourceIndex: 0,
        reasonCodes: ['PROCESSING_ERROR'],
        processingError: { type: expectedType },
      },
      'Job rejected',
    );
  });

  it.each([
    {
      label: 'at the limit',
      message: 'x'.repeat(1_024),
      expectedMessage: 'x'.repeat(1_024),
    },
    {
      label: 'above the limit',
      message: 'x'.repeat(1_025),
      expectedMessage: `${'x'.repeat(1_011)}… [truncated]`,
    },
  ])('keeps the processing error message bounded $label', ({ message, expectedMessage }) => {
    const logger = pino({ enabled: false });
    const info = vi.spyOn(logger, 'info');
    const adapter = new PinoJobRejectionLogger(logger);

    adapter.logJobRejected({
      event: 'job_rejected',
      jobId: 'jobs.json:0',
      sourceId: 'jobs.json',
      source: 'jobs.json',
      sourceIndex: 0,
      reasonCodes: ['PROCESSING_ERROR'],
      processingError: new Error(message),
    });

    expect(info).toHaveBeenCalledWith(
      {
        event: 'job_rejected',
        jobId: 'jobs.json:0',
        sourceId: 'jobs.json',
        source: 'jobs.json',
        sourceIndex: 0,
        reasonCodes: ['PROCESSING_ERROR'],
        processingError: {
          name: 'Error',
          message: expectedMessage,
        },
      },
      'Job rejected',
    );
  });
});
