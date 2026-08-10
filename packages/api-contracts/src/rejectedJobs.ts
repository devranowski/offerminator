export type RejectionCodeDto =
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

export interface RejectionReasonDto {
  readonly code: RejectionCodeDto;
  readonly field: string;
  readonly message: string;
}

export interface RejectedJobDto {
  readonly id: string;
  readonly title: string | null;
  readonly company: string | null;
  readonly source: string;
  readonly sourceIndex: number;
  readonly reasons: readonly RejectionReasonDto[];
  readonly raw: unknown;
}

export interface RejectedJobsResponseDto {
  readonly items: readonly RejectedJobDto[];
  readonly total: number;
}
