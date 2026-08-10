import type { CurrencyConversionResult } from '../../models/currencyConversionResult.js';
import type { RejectionReason } from '../../models/rejectionReason.js';
import type { UnknownSalary } from '../../models/salary.js';
import type { ApprovalRule } from '../approvalContext.js';
import { meetsCompensationThreshold } from '../compensationPolicy.js';
import { annualizeSalaryUsdCents, type SalaryAnnualizationResult } from '../salaryAnnualizer.js';

const salaryRule: ApprovalRule = (job, context) => {
  const salary = job.salary;

  if (salary.kind === 'unknown') {
    return [unknownSalaryRejection(salary)];
  }

  const conversion = context.currencyConverter.toUsdCents(salary.amount, salary.currency);

  if (!conversion.ok) {
    return [conversionFailureRejection(conversion, salary.amount)];
  }

  const annualization = annualizeSalaryUsdCents(conversion.usdCents, salary.kind);

  if (!annualization.ok) {
    return [annualizationFailureRejection(annualization, salary.amount)];
  }

  const threshold = context.compensationPolicy.getThreshold(job, salary.kind);

  if (!meetsCompensationThreshold(conversion.usdCents, threshold)) {
    return [belowThresholdRejection(salary.kind, conversion.usdCents)];
  }

  context.recordApprovedJobCompensation(
    conversion.usdCents,
    annualization.annualizedSalaryUsdCents,
  );

  return [];
};

function conversionFailureRejection(
  conversion: Extract<CurrencyConversionResult, { ok: false }>,
  salaryAmount: number,
): RejectionReason {
  switch (conversion.reason) {
    case 'unsupported-currency':
      return unsupportedCurrencyRejection(conversion.currency);
    case 'amount-out-of-range':
      return invalidSalaryRejection(
        'Salary amount is outside the supported numeric range.',
        salaryAmount,
      );
    default:
      return assertNever(conversion);
  }
}

function annualizationFailureRejection(
  annualization: Extract<SalaryAnnualizationResult, { ok: false }>,
  salaryAmount: number,
): RejectionReason {
  annualization.reason satisfies 'amount-out-of-range';

  return invalidSalaryRejection(
    'Annualized salary is outside the supported numeric range.',
    salaryAmount,
  );
}

function unknownSalaryRejection(salary: UnknownSalary): RejectionReason {
  return salary.reason === 'missing'
    ? {
        code: 'SALARY_MISSING',
        field: 'salary',
        message: 'Salary is required.',
        actualValue: salary.raw,
      }
    : invalidSalaryRejection('Salary is invalid.', salary.raw);
}

function unsupportedCurrencyRejection(currency: string): RejectionReason {
  return {
    code: 'SALARY_CURRENCY_UNSUPPORTED',
    field: 'salary.currency',
    message: `Salary currency ${currency} is not supported.`,
    actualValue: currency,
  };
}

function invalidSalaryRejection(message: string, actualValue: unknown): RejectionReason {
  return {
    code: 'SALARY_INVALID',
    field: 'salary',
    message,
    actualValue,
  };
}

function belowThresholdRejection(
  salaryKind: 'annual' | 'hourly',
  salaryUsdCents: number,
): RejectionReason {
  return {
    code:
      salaryKind === 'annual' ? 'ANNUAL_SALARY_BELOW_THRESHOLD' : 'HOURLY_SALARY_BELOW_THRESHOLD',
    field: 'salary',
    message: `${salaryKind === 'annual' ? 'Annual' : 'Hourly'} salary does not meet the required threshold.`,
    actualValue: salaryUsdCents,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled salary calculation failure: ${JSON.stringify(value)}`);
}

export { salaryRule };
