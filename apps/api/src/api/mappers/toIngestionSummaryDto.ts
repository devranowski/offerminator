import type { IngestionSummaryDto } from '@offerminator/api-contracts';

import type { IngestionSummary } from '../../ingestion/ingestionSummary.js';

function toIngestionSummaryDto(summary: IngestionSummary): IngestionSummaryDto {
  return {
    totalSources: summary.totalSources,
    successfulSources: summary.successfulSources,
    failedSources: summary.failedSources,
    totalRecords: summary.totalRecords,
    approved: summary.approved,
    rejected: summary.rejected,
    sources: summary.sources.map((source) => ({
      sourceId: source.sourceId,
      name: source.name,
      totalRecords: source.totalRecords,
      approved: source.approved,
      rejected: source.rejected,
    })),
    sourceErrors: summary.sourceErrors.map((error) => ({
      sourceId: error.sourceId,
      source: error.source,
      code: error.code,
      message: error.message,
    })),
  };
}

export { toIngestionSummaryDto };
