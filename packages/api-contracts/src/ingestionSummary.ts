export type SourceErrorCodeDto =
  'FILE_NOT_FOUND' | 'INVALID_JSON' | 'ROOT_NOT_ARRAY' | 'READ_ERROR';

export interface SourceSummaryDto {
  readonly name: string;
  readonly totalRecords: number;
  readonly approved: number;
  readonly rejected: number;
}

export interface SourceErrorDto {
  readonly source: string;
  readonly code: SourceErrorCodeDto;
  readonly message: string;
}

export interface IngestionSummaryDto {
  readonly totalSources: number;
  readonly successfulSources: number;
  readonly failedSources: number;
  readonly totalRecords: number;
  readonly approved: number;
  readonly rejected: number;
  readonly sources: readonly SourceSummaryDto[];
  readonly sourceErrors: readonly SourceErrorDto[];
}
