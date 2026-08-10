import { z } from 'zod';

export interface AppConfig {
  readonly host: string;
  readonly port: number;
}

const appConfigSchema = z.object({
  HOST: z.string().trim().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3_000),
});

function loadConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AppConfig {
  const config = appConfigSchema.parse(environment);

  return {
    host: config.HOST,
    port: config.PORT,
  };
}

export { loadConfig };
