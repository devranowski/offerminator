import {
  rejectedJobsResponseSchema,
  type RejectedJobsResponseDto,
} from '@offerminator/api-contracts';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';

import type { RejectedJobRepository } from '../storage/rejectedJobRepository.js';
import { toRejectedJobDto } from './mappers/toRejectedJobDto.js';
import { errorResponseSchema } from './schemas/responseSchemas.js';

export interface RejectedJobsRoutesDependencies {
  readonly rejectedJobs: Pick<RejectedJobRepository, 'findAll'>;
}

function registerRejectedJobsRoutes(
  app: FastifyInstance,
  dependencies: RejectedJobsRoutesDependencies,
): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/api/rejected-jobs',
    {
      schema: {
        response: {
          200: rejectedJobsResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async () => {
      const jobs = await dependencies.rejectedJobs.findAll();
      const items = jobs.map(toRejectedJobDto);

      return {
        items,
        total: items.length,
      } satisfies RejectedJobsResponseDto;
    },
  );
}

export { registerRejectedJobsRoutes };
