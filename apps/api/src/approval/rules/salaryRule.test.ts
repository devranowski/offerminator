import { describe, expect, it } from 'vitest';

import { FixedRateCurrencyConverter } from '../../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../../currency/rates.js';
import type { RejectionCode } from '../../models/rejectionReason.js';
import type { Salary, UnknownSalaryReason } from '../../models/salary.js';
import { createNormalizedJobCandidate } from '../../../test/fixtures/normalizedJobCandidate.js';
import { ApprovalContext } from '../approvalContext.js';
import { DefaultCompensationPolicy, type CompensationPolicy } from '../compensationPolicy.js';
import { HOURS_PER_YEAR } from '../salaryAnnualizer.js';
import { salaryRule } from './salaryRule.js';

interface SalaryCase {
  readonly name: string;
  readonly salary: Salary;
  readonly expectedCode: RejectionCode | null;
  readonly expectedCompensation: ExpectedCompensation | null;
}

interface ExpectedCompensation {
  readonly salaryUsdCents: number;
  readonly annualizedSalaryUsdCents: number;
}

const converter = new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT);
const defaultPolicy = new DefaultCompensationPolicy();

const thresholdAndCurrencyCases: readonly SalaryCase[] = [
  {
    name: '100,000 USD annually',
    salary: annualSalary(100_000, 'USD'),
    expectedCode: 'ANNUAL_SALARY_BELOW_THRESHOLD',
    expectedCompensation: null,
  },
  {
    name: '100,000.01 USD annually',
    salary: annualSalary(100_000.01, 'USD'),
    expectedCode: null,
    expectedCompensation: {
      salaryUsdCents: 10_000_001,
      annualizedSalaryUsdCents: 10_000_001,
    },
  },
  {
    name: '45 USD hourly',
    salary: hourlySalary(45, 'USD'),
    expectedCode: 'HOURLY_SALARY_BELOW_THRESHOLD',
    expectedCompensation: null,
  },
  {
    name: '45.01 USD hourly',
    salary: hourlySalary(45.01, 'USD'),
    expectedCode: null,
    expectedCompensation: {
      salaryUsdCents: 4_501,
      annualizedSalaryUsdCents: 4_501 * HOURS_PER_YEAR,
    },
  },
  {
    name: '85,000 GBP annually',
    salary: annualSalary(85_000, 'GBP'),
    expectedCode: null,
    expectedCompensation: {
      salaryUsdCents: 10_625_000,
      annualizedSalaryUsdCents: 10_625_000,
    },
  },
  {
    name: '78,000 EUR annually',
    salary: annualSalary(78_000, 'EUR'),
    expectedCode: 'ANNUAL_SALARY_BELOW_THRESHOLD',
    expectedCompensation: null,
  },
  {
    name: '58 EUR hourly',
    salary: hourlySalary(58, 'EUR'),
    expectedCode: null,
    expectedCompensation: {
      salaryUsdCents: 6_264,
      annualizedSalaryUsdCents: 6_264 * HOURS_PER_YEAR,
    },
  },
  {
    name: '20,000 CAD annually',
    salary: annualSalary(20_000, 'CAD'),
    expectedCode: 'ANNUAL_SALARY_BELOW_THRESHOLD',
    expectedCompensation: null,
  },
];

const unknownSalaryCases: readonly (readonly [UnknownSalaryReason, RejectionCode])[] = [
  ['missing', 'SALARY_MISSING'],
  ['invalid-value', 'SALARY_INVALID'],
  ['invalid-unit', 'SALARY_INVALID'],
  ['missing-currency', 'SALARY_INVALID'],
];

describe('salaryRule', () => {
  it.each(thresholdAndCurrencyCases)('$name', (testCase) => {
    const result = evaluateSalary(testCase.salary);

    expect(result.reasons.map((reason) => reason.code)).toEqual(
      testCase.expectedCode === null ? [] : [testCase.expectedCode],
    );
    expect(result.compensation).toEqual(testCase.expectedCompensation);
  });

  it.each(unknownSalaryCases)(
    'maps unknown salary reason %s to %s',
    (unknownReason, expectedCode) => {
      expectRejectedSalary(unknownSalary(unknownReason), expectedCode);
    },
  );

  it('rejects an unsupported currency without recording compensation', () => {
    expectRejectedSalary(annualSalary(120_000, 'XYZ'), 'SALARY_CURRENCY_UNSUPPORTED');
  });

  it('keeps an unbounded unsupported currency value out of the diagnostic message', () => {
    const currency = 'X'.repeat(10_000);
    const result = evaluateSalary(annualSalary(120_000, currency));

    expect(result.reasons).toEqual([
      {
        code: 'SALARY_CURRENCY_UNSUPPORTED',
        field: 'salary.currency',
        message: 'Salary currency is not supported.',
        actualValue: currency,
      },
    ]);
    expect(result.compensation).toBeNull();
  });

  it('maps a conversion range failure to SALARY_INVALID', () => {
    const firstUnsafeUsdAmount = Math.floor(Number.MAX_SAFE_INTEGER / 100) + 1;

    expectRejectedSalary(annualSalary(firstUnsafeUsdAmount, 'USD'), 'SALARY_INVALID');
  });

  it('maps an annualization-only range failure to SALARY_INVALID', () => {
    const largestSafeHourlyUsdCents = Math.floor(Number.MAX_SAFE_INTEGER / HOURS_PER_YEAR);
    const firstUnsafeHourlyUsdAmount = Math.floor(largestSafeHourlyUsdCents / 100) + 1;
    const conversion = converter.toUsdCents(firstUnsafeHourlyUsdAmount, 'USD');

    if (!conversion.ok) {
      throw new Error('Expected the synthetic hourly salary to convert safely.');
    }

    expect(Number.isSafeInteger(conversion.usdCents)).toBe(true);

    expectRejectedSalary(hourlySalary(firstUnsafeHourlyUsdAmount, 'USD'), 'SALARY_INVALID');
  });

  it('does not confuse an unsupported currency with a range failure', () => {
    expectRejectedSalary(annualSalary(Number.MAX_VALUE, 'XYZ'), 'SALARY_CURRENCY_UNSUPPORTED');
  });

  it('honors an injected inclusive compensation policy', () => {
    const inclusivePolicy: CompensationPolicy = {
      getThreshold: () => ({
        amountUsdCents: 10_000_000,
        operator: 'gte',
      }),
    };

    const result = evaluateSalary(annualSalary(100_000, 'USD'), inclusivePolicy);

    expect(result.reasons).toEqual([]);
    expect(result.compensation).toEqual({
      salaryUsdCents: 10_000_000,
      annualizedSalaryUsdCents: 10_000_000,
    });
  });
});

function evaluateSalary(salary: Salary, policy: CompensationPolicy = defaultPolicy) {
  const context = new ApprovalContext(converter, policy);
  const candidate = createNormalizedJobCandidate({ salary });

  return {
    reasons: salaryRule(candidate, context),
    compensation: context.getApprovedJobCompensation(),
  };
}

function expectRejectedSalary(salary: Salary, expectedCode: RejectionCode): void {
  const result = evaluateSalary(salary);

  expect(result.reasons.map((reason) => reason.code)).toEqual([expectedCode]);
  expect(result.compensation).toBeNull();
}

function annualSalary(amount: number, currency: string): Salary {
  return {
    kind: 'annual',
    amount,
    currency,
    source: 'explicit',
  };
}

function hourlySalary(amount: number, currency: string): Salary {
  return {
    kind: 'hourly',
    amount,
    currency,
    source: 'explicit',
  };
}

function unknownSalary(reason: UnknownSalaryReason): Salary {
  return { kind: 'unknown', reason, raw: reason };
}
