import type { Salary, UnknownSalaryReason } from '../models/salary.js';
import { normalizeOptionalString } from './normalizeString.js';

type UnknownRecord = Record<string, unknown>;

export function normalizeSalary(value: unknown): Salary {
  if (value === null || value === undefined) {
    return unknownSalary('missing', value);
  }

  if (typeof value === 'number') {
    return isValidAmount(value)
      ? {
          kind: 'annual',
          amount: value,
          currency: 'USD',
          source: 'implicit-flat-format',
        }
      : unknownSalary('invalid-value', value);
  }

  if (!isRecord(value) || !isValidAmount(value['value'])) {
    return unknownSalary('invalid-value', value);
  }

  const amount = value['value'];
  const currency = normalizeOptionalString(value['currency'])?.toUpperCase() ?? null;

  if (currency === null) {
    return unknownSalary('missing-currency', value);
  }

  const unit = value['unit'];

  if (unit === undefined) {
    return annualSalary(amount, currency);
  }

  const normalizedUnit = normalizeOptionalString(unit)?.toLowerCase();

  if (normalizedUnit === 'annual') {
    return annualSalary(amount, currency);
  }

  if (normalizedUnit === 'hourly') {
    return {
      kind: 'hourly',
      amount,
      currency,
      source: 'explicit',
    };
  }

  return unknownSalary('invalid-unit', value);
}

function annualSalary(amount: number, currency: string): Salary {
  return {
    kind: 'annual',
    amount,
    currency,
    source: 'explicit',
  };
}

function unknownSalary(reason: UnknownSalaryReason, raw: unknown): Salary {
  return { kind: 'unknown', reason, raw };
}

function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
