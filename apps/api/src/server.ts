import { fileURLToPath } from 'node:url';

import pino from 'pino';

import { PinoJobRejectionLogger } from './api/pinoJobRejectionLogger.js';
import { buildApp } from './app.js';
import { createDependencies, startApplication } from './bootstrap.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const logger = pino();
const dependencies = createDependencies(config, new PinoJobRejectionLogger(logger));
const app = await buildApp(
  dependencies,
  process.env['NODE_ENV'] === 'production'
    ? {
        loggerInstance: logger,
        frontendRoot: fileURLToPath(new URL('../../web/dist', import.meta.url)),
      }
    : { loggerInstance: logger },
);

await startApplication({
  app,
  ingestionService: dependencies.ingestionService,
  config,
});
