import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import type { IngestionService } from './ingestion/ingestionService.js';
import type { JobSearchService } from './search/jobSearchService.js';
import type { RejectedJobRepository } from './storage/rejectedJobRepository.js';
import { registerErrorHandler } from './api/errorHandler.js';
import { registerHealthRoutes } from './api/healthRoutes.js';
import { registerIngestionSummaryRoutes } from './api/ingestionSummaryRoutes.js';
import { registerJobsRoutes } from './api/jobsRoutes.js';
import { registerRejectedJobsRoutes } from './api/rejectedJobsRoutes.js';

export interface AppDependencies {
  readonly searchService: Pick<JobSearchService, 'search'>;
  readonly rejectedJobs: Pick<RejectedJobRepository, 'findAll'>;
  readonly ingestionService: Pick<IngestionService, 'getLastSummary'>;
}

export async function buildApp(
  dependencies: AppDependencies,
  options: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify(options);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerApp(app, dependencies);
  await app.ready();

  return app;
}

function registerApp(app: FastifyInstance, dependencies: AppDependencies): void {
  registerErrorHandler(app);
  registerHealthRoutes(app);
  registerJobsRoutes(app, { searchService: dependencies.searchService });
  registerRejectedJobsRoutes(app, { rejectedJobs: dependencies.rejectedJobs });
  registerIngestionSummaryRoutes(app, { ingestionService: dependencies.ingestionService });
}
