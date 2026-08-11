import type { SourceError } from './jobSourceLoader.js';

export interface SourceSummary {
  readonly sourceId: string;
  readonly name: string;
  readonly totalRecords: number;
  readonly approved: number;
  readonly rejected: number;
}

export interface IngestionSummary {
  readonly totalSources: number;
  readonly successfulSources: number;
  readonly failedSources: number;
  readonly totalRecords: number;
  readonly approved: number;
  readonly rejected: number;
  readonly sources: readonly SourceSummary[];
  readonly sourceErrors: readonly SourceError[];
}
