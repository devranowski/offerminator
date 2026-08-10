import type { IngestionSummaryDto } from '@offerminator/api-contracts';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';

import type { IngestionService } from '../ingestion/ingestionService.js';
import { toIngestionSummaryDto } from './mappers/toIngestionSummaryDto.js';
import { errorResponseSchema, ingestionSummaryResponseSchema } from './schemas/responseSchemas.js';

export interface IngestionSummaryRoutesDependencies {
  readonly ingestionService: Pick<IngestionService, 'getLastSummary'>;
}

export function registerIngestionSummaryRoutes(
  app: FastifyInstance,
  dependencies: IngestionSummaryRoutesDependencies,
): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/api/ingestion-summary',
    {
      schema: {
        response: {
          200: ingestionSummaryResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    () => {
      const summary = dependencies.ingestionService.getLastSummary();

      if (summary === null) {
        throw new Error('Ingestion invariant violated: summary is unavailable after bootstrap.');
      }

      return toIngestionSummaryDto(summary) satisfies IngestionSummaryDto;
    },
  );
}
