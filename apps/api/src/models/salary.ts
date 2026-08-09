export type UnknownSalaryReason = 'missing' | 'invalid-value' | 'invalid-unit' | 'missing-currency';

export interface AnnualSalary {
  readonly kind: 'annual';
  readonly amount: number;
  readonly currency: string;
  readonly source: 'explicit' | 'implicit-flat-format';
}

export interface HourlySalary {
  readonly kind: 'hourly';
  readonly amount: number;
  readonly currency: string;
  readonly source: 'explicit';
}

export interface UnknownSalary {
  readonly kind: 'unknown';
  readonly reason: UnknownSalaryReason;
  readonly raw: unknown;
}

export type Salary = AnnualSalary | HourlySalary | UnknownSalary;

export type ApprovedSalary = AnnualSalary | HourlySalary;
