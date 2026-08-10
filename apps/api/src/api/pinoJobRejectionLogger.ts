import type { Logger } from 'pino';

import type { JobRejectedLogEvent, JobRejectionLogger } from '../ingestion/jobRejectionLogger.js';

export class PinoJobRejectionLogger implements JobRejectionLogger {
  constructor(private readonly logger: Pick<Logger, 'info'>) {}

  logJobRejected(event: JobRejectedLogEvent): void {
    const hasProcessingError = Object.hasOwn(event, 'processingError');
    const { processingError, ...fields } = event;

    this.logger.info(
      {
        ...fields,
        ...(hasProcessingError
          ? { processingError: describeProcessingError(processingError) }
          : {}),
      },
      'Job rejected',
    );
  }
}

function describeProcessingError(error: unknown): { readonly type: string } {
  return {
    type: error instanceof Error ? error.name : typeof error,
  };
}
