import { z } from 'zod/v4';

const errorResponseSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
});

export const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

export { errorResponseSchema };
