import type { JobsResponseDto } from '@offerminator/api-contracts';
import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';

import type { JobSearchService } from '../search/jobSearchService.js';
import { toJobDto } from './mappers/toJobDto.js';
import { jobsQuerySchema } from './schemas/jobsQuerySchema.js';
import { errorResponseSchema, jobsResponseSchema } from './schemas/responseSchemas.js';

export interface JobsRoutesDependencies {
  readonly searchService: Pick<JobSearchService, 'search'>;
}

export function registerJobsRoutes(
  app: FastifyInstance,
  dependencies: JobsRoutesDependencies,
): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/api/jobs',
    {
      schema: {
        querystring: jobsQuerySchema,
        response: {
          200: jobsResponseSchema,
          400: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const jobs = await dependencies.searchService.search(request.query);
      const items = jobs.map(toJobDto);

      return {
        items,
        total: items.length,
      } satisfies JobsResponseDto;
    },
  );
}
