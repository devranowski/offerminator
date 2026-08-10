import { fileURLToPath } from 'node:url';

import type { FastifyInstance } from 'fastify';

import { ApprovalPolicy, approvalRules } from './approval/approvalPolicy.js';
import { DefaultCompensationPolicy } from './approval/compensationPolicy.js';
import type { AppDependencies } from './app.js';
import type { AppConfig } from './config.js';
import { FixedRateCurrencyConverter } from './currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from './currency/rates.js';
import { IngestionService } from './ingestion/ingestionService.js';
import type { JobRejectionLogger } from './ingestion/jobRejectionLogger.js';
import { FileSystemJobSourceLoader } from './ingestion/jobSourceLoader.js';
import { JobSearchService } from './search/jobSearchService.js';
import { InMemoryApprovedJobRepository } from './storage/inMemoryApprovedJobRepository.js';
import { InMemoryRejectedJobRepository } from './storage/inMemoryRejectedJobRepository.js';

export interface ApplicationDependencies extends AppDependencies {
  readonly config: AppConfig;
  readonly ingestionService: IngestionService;
}

export function createDependencies(
  config: AppConfig,
  logger: JobRejectionLogger,
): ApplicationDependencies {
  const currencyConverter = new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT);
  const compensationPolicy = new DefaultCompensationPolicy();
  const approvalPolicy = new ApprovalPolicy({
    rules: approvalRules,
    currencyConverter,
    compensationPolicy,
  });
  const approvedJobs = new InMemoryApprovedJobRepository();
  const rejectedJobs = new InMemoryRejectedJobRepository();
  const ingestionService = new IngestionService({
    sourceLoader: new FileSystemJobSourceLoader(),
    sourcePaths: [fileURLToPath(new URL('../../../data/jobs.json', import.meta.url))],
    approvalPolicy,
    approvedJobs,
    rejectedJobs,
    logger,
  });

  return {
    config,
    ingestionService,
    searchService: new JobSearchService({ approvedJobs }),
    rejectedJobs,
  };
}

export interface StartApplicationOptions {
  readonly app: Pick<FastifyInstance, 'listen'>;
  readonly ingestionService: Pick<IngestionService, 'ingestConfiguredSources'>;
  readonly config: AppConfig;
}

export async function startApplication(options: StartApplicationOptions): Promise<void> {
  await options.ingestionService.ingestConfiguredSources();
  await options.app.listen({
    host: options.config.host,
    port: options.config.port,
  });
}
