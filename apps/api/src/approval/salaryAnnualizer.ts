import type { ApprovedSalary } from '../models/salary.js';

export const HOURS_PER_YEAR = 2_080;

export type SalaryAnnualizationResult =
  | {
      readonly ok: true;
      readonly annualizedSalaryUsdCents: number;
    }
  | {
      readonly ok: false;
      readonly reason: 'amount-out-of-range';
    };

export function annualizeSalaryUsdCents(
  amountUsdCents: number,
  salaryKind: ApprovedSalary['kind'],
): SalaryAnnualizationResult {
  const annualizedSalaryUsdCents =
    salaryKind === 'hourly' ? amountUsdCents * HOURS_PER_YEAR : amountUsdCents;

  return Number.isSafeInteger(annualizedSalaryUsdCents)
    ? { ok: true, annualizedSalaryUsdCents }
    : { ok: false, reason: 'amount-out-of-range' };
}
