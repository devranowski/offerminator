import type { Logger } from 'pino';

import type { JobRejectedLogEvent, JobRejectionLogger } from '../ingestion/jobRejectionLogger.js';

type ProcessingErrorDescription =
  { readonly name: string; readonly message: string } | { readonly type: string };

const MAX_PROCESSING_ERROR_MESSAGE_LENGTH = 1_024;
const TRUNCATED_MESSAGE_SUFFIX = '… [truncated]';

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

function describeProcessingError(error: unknown): ProcessingErrorDescription {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: truncateMessage(error.message),
    };
  }

  return {
    type: typeof error,
  };
}

function truncateMessage(message: string): string {
  if (message.length <= MAX_PROCESSING_ERROR_MESSAGE_LENGTH) {
    return message;
  }

  return `${message.slice(
    0,
    MAX_PROCESSING_ERROR_MESSAGE_LENGTH - TRUNCATED_MESSAGE_SUFFIX.length,
  )}${TRUNCATED_MESSAGE_SUFFIX}`;
}
