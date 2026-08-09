export type NormalizationWarningCode = 'INVALID_POSTING_DATE' | 'SUSPICIOUS_ANNUAL_SALARY';

export interface NormalizationWarning {
  readonly code: NormalizationWarningCode;
  readonly field: string;
  readonly message: string;
  readonly actualValue?: unknown;
}
