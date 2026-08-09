export type RejectionCode =
  | 'INVALID_RECORD_SHAPE'
  | 'TITLE_MISSING'
  | 'LOCATION_UNKNOWN'
  | 'IN_PERSON_COUNTRY_UNKNOWN'
  | 'IN_PERSON_COUNTRY_NOT_ALLOWED'
  | 'EMPLOYMENT_TYPE_UNKNOWN'
  | 'EMPLOYMENT_TYPE_NOT_FULL_TIME'
  | 'SALARY_MISSING'
  | 'SALARY_INVALID'
  | 'SALARY_CURRENCY_UNSUPPORTED'
  | 'ANNUAL_SALARY_BELOW_THRESHOLD'
  | 'HOURLY_SALARY_BELOW_THRESHOLD'
  | 'STAFFING_FIRM'
  | 'COMPANY_TYPE_UNKNOWN'
  | 'LANGUAGE_MISSING'
  | 'LANGUAGE_NOT_ALLOWED'
  | 'PROCESSING_ERROR';

export interface RejectionReason {
  readonly code: RejectionCode;
  readonly field: string;
  readonly message: string;
  readonly actualValue?: unknown;
}
