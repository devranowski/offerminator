import fastifyStatic from '@fastify/static';
import { serializerCompiler, validatorCompiler } from '@fastify/type-provider-zod';
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from 'fastify';

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

type BuildAppOptions = FastifyServerOptions & {
  readonly frontendRoot?: string;
};

async function buildApp(
  dependencies: AppDependencies,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const { frontendRoot, ...serverOptions } = options;
  const app = Fastify(serverOptions);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerApp(app, dependencies);

  if (frontendRoot !== undefined) {
    registerFrontend(app, frontendRoot);
  }

  await app.ready();

  return app;
}

function registerFrontend(app: FastifyInstance, frontendRoot: string): void {
  app.register(fastifyStatic, {
    root: frontendRoot,
    index: false,
    maxAge: '1y',
    immutable: true,
  });

  app.get('/', sendFrontendIndex);
  app.get('/index.html', sendFrontendIndex);
}

function sendFrontendIndex(_request: FastifyRequest, reply: FastifyReply): FastifyReply {
  return reply.sendFile('index.html', {
    maxAge: 0,
    immutable: false,
  });
}

function registerApp(app: FastifyInstance, dependencies: AppDependencies): void {
  registerErrorHandler(app);
  registerHealthRoutes(app);
  registerJobsRoutes(app, { searchService: dependencies.searchService });
  registerRejectedJobsRoutes(app, { rejectedJobs: dependencies.rejectedJobs });
  registerIngestionSummaryRoutes(app, { ingestionService: dependencies.ingestionService });
}

export { buildApp };
