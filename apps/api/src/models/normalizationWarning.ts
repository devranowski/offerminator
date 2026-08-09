export type NormalizationWarningCode = 'INVALID_POSTING_DATE';

export interface NormalizationWarning {
  readonly code: NormalizationWarningCode;
  readonly field: string;
  readonly message: string;
  readonly actualValue?: unknown;
}
