import type { ZodTypeProvider } from '@fastify/type-provider-zod';
import type { FastifyInstance } from 'fastify';

import { errorResponseSchema, healthResponseSchema } from './schemas/responseSchemas.js';

function registerHealthRoutes(app: FastifyInstance): void {
  app.withTypeProvider<ZodTypeProvider>().get(
    '/api/health',
    {
      schema: {
        response: {
          200: healthResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    () => ({ status: 'ok' as const }),
  );
}

export { registerHealthRoutes };
