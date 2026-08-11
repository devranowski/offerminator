import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { FixedRateCurrencyConverter } from '../currency/fixedRateCurrencyConverter.js';
import { USD_CENTS_PER_CURRENCY_UNIT } from '../currency/rates.js';
import { normalizeJob } from '../ingestion/normalizeJob.js';
import type { ApprovalDecision } from '../models/approvalDecision.js';
import type { NormalizedJobCandidate } from '../models/normalizedJob.js';
import type { RawJobEnvelope } from '../models/rawJob.js';
import type { RejectionCode, RejectionReason } from '../models/rejectionReason.js';
import {
  createNormalizedJobCandidate,
  requiredCountryCode,
} from '../../test/fixtures/normalizedJobCandidate.js';
import type { ApprovalRule } from './approvalContext.js';
import { ApprovalPolicy, approvalRules } from './approvalPolicy.js';
import { DefaultCompensationPolicy } from './compensationPolicy.js';

const currencyConverter = new FixedRateCurrencyConverter(USD_CENTS_PER_CURRENCY_UNIT);
const compensationPolicy = new DefaultCompensationPolicy();

describe('ApprovalPolicy', () => {
  it('creates an approved annual job with converted and annualized compensation', () => {
    const decision = createPolicy().evaluate(createNormalizedJobCandidate());

    expect(decision).toEqual({
      status: 'approved',
      job: {
        id: 'test:0',
        title: 'Backend Engineer',
        description: 'Build reliable software.',
        company: 'Example Company',
        location: {
          kind: 'remote',
          city: null,
          region: null,
          country: 'US',
          raw: 'Remote, US',
        },
        salary: {
          kind: 'annual',
          amount: 120_000,
          currency: 'USD',
          source: 'explicit',
        },
        employmentType: 'full-time',
        companyType: 'direct-employer',
        language: 'english',
        postingDate: null,
        salaryUsdCents: 12_000_000,
        annualizedSalaryUsdCents: 12_000_000,
      },
    });
  });

  it('creates an approved hourly job with annualized compensation', () => {
    const decision = createPolicy().evaluate(
      createNormalizedJobCandidate({
        salary: {
          kind: 'hourly',
          amount: 60,
          currency: 'USD',
          source: 'explicit',
        },
      }),
    );

    expect(decision).toMatchObject({
      status: 'approved',
      job: {
        salary: {
          kind: 'hourly',
          amount: 60,
          currency: 'USD',
        },
        salaryUsdCents: 6_000,
        annualizedSalaryUsdCents: 12_480_000,
      },
    });
  });

  it('runs every rule and preserves their deterministic reason order', () => {
    const expectedCodes = [
      'TITLE_MISSING',
      'STAFFING_FIRM',
      'LANGUAGE_NOT_ALLOWED',
    ] satisfies readonly RejectionCode[];
    const calls: number[] = [];
    const rules: readonly ApprovalRule[] = [
      createRejectingRule(1, 'TITLE_MISSING', calls),
      createRejectingRule(2, 'STAFFING_FIRM', calls),
      createRejectingRule(3, 'LANGUAGE_NOT_ALLOWED', calls),
    ];
    const decision = createPolicy(rules).evaluate(createNormalizedJobCandidate());

    expect(calls).toEqual([1, 2, 3]);
    expectReasonCodes(decision, expectedCodes);
    expect(rejectedDecision(decision).reasons.map((reason) => reason.code)).toEqual(expectedCodes);
  });

  it('creates a fresh approval context for every evaluation', () => {
    const observedCompensations: unknown[] = [];
    const compensationRule: ApprovalRule = (_job, context) => {
      observedCompensations.push(context.getApprovedJobCompensation());
      context.recordApprovedJobCompensation(12_000_000, 12_000_000);
      return [];
    };
    const policy = createPolicy([compensationRule]);

    policy.evaluate(createNormalizedJobCandidate({ id: 'test:1' }));
    policy.evaluate(createNormalizedJobCandidate({ id: 'test:2' }));

    expect(observedCompensations).toEqual([null, null]);
  });

  it('keeps location and language rules connected to the default policy', () => {
    const decision = createPolicy().evaluate(
      createNormalizedJobCandidate({
        location: {
          kind: 'in-person',
          city: 'Berlin',
          region: null,
          country: requiredCountryCode('DE'),
          raw: 'Berlin, DE',
        },
        language: 'french',
      }),
    );

    expectReasonCodes(decision, ['IN_PERSON_COUNTRY_NOT_ALLOWED', 'LANGUAGE_NOT_ALLOWED']);
  });

  it('reconstructs the raw envelope when a candidate is rejected', () => {
    const candidate = normalizeFixtureRecord(19);
    const decision = createPolicy().evaluate(candidate);

    expect(rejectedDecision(decision).raw).toEqual({
      id: candidate.id,
      sourceId: candidate.sourceId,
      source: candidate.source,
      sourceIndex: candidate.sourceIndex,
      payload: candidate.raw,
    });
  });

  it.each([
    [4, ['EMPLOYMENT_TYPE_NOT_FULL_TIME']],
    [16, ['EMPLOYMENT_TYPE_NOT_FULL_TIME', 'STAFFING_FIRM']],
    [
      19,
      [
        'TITLE_MISSING',
        'EMPLOYMENT_TYPE_NOT_FULL_TIME',
        'HOURLY_SALARY_BELOW_THRESHOLD',
        'STAFFING_FIRM',
      ],
    ],
  ] satisfies ReadonlyArray<readonly [number, readonly RejectionCode[]]>)(
    'returns the expected unique reason-code set for fixture record #%i',
    (sourceIndex, expectedCodes) => {
      const decision = createPolicy().evaluate(normalizeFixtureRecord(sourceIndex));

      expectReasonCodes(decision, expectedCodes);
    },
  );

  it.each([
    [
      'conversion range failure',
      {
        kind: 'annual',
        amount: Number.MAX_SAFE_INTEGER,
        currency: 'USD',
        source: 'explicit',
      },
      'SALARY_INVALID',
    ],
    [
      'annualization range failure',
      {
        kind: 'hourly',
        amount: 100_000_000_000,
        currency: 'USD',
        source: 'explicit',
      },
      'SALARY_INVALID',
    ],
    [
      'unsupported currency',
      {
        kind: 'annual',
        amount: 120_000,
        currency: 'XYZ',
        source: 'explicit',
      },
      'SALARY_CURRENCY_UNSUPPORTED',
    ],
  ] satisfies ReadonlyArray<readonly [string, NormalizedJobCandidate['salary'], RejectionCode]>)(
    'maps a synthetic %s to its expected rejection code',
    (_caseName, salary, expectedCode) => {
      const decision = createPolicy().evaluate(createNormalizedJobCandidate({ salary }));

      expectReasonCodes(decision, [expectedCode]);
    },
  );

  it('fails loudly when no rule records compensation for an otherwise approved candidate', () => {
    expect(() => createPolicy([]).evaluate(createNormalizedJobCandidate())).toThrow(
      'Approval invariant violated: compensation was not recorded.',
    );
  });

  it('fails loudly when the rules and approved-job factory disagree', () => {
    const compensationRule: ApprovalRule = (_job, context) => {
      context.recordApprovedJobCompensation(12_000_000, 12_000_000);
      return [];
    };

    expect(() =>
      createPolicy([compensationRule]).evaluate(createNormalizedJobCandidate({ title: null })),
    ).toThrow('Approval invariant violated: approved job construction failed.');
  });

  it.each([
    {
      name: 'converted salary',
      salaryUsdCents: Number.MAX_SAFE_INTEGER + 1,
      annualizedSalaryUsdCents: 12_000_000,
    },
    {
      name: 'annualized salary',
      salaryUsdCents: 12_000_000,
      annualizedSalaryUsdCents: Number.MAX_SAFE_INTEGER + 1,
    },
  ])('refuses to record an unsafe $name amount', (compensation) => {
    const invalidCompensationRule: ApprovalRule = (_job, context) => {
      context.recordApprovedJobCompensation(
        compensation.salaryUsdCents,
        compensation.annualizedSalaryUsdCents,
      );
      return [];
    };

    expect(() =>
      createPolicy([invalidCompensationRule]).evaluate(createNormalizedJobCandidate()),
    ).toThrow('Approval invariant violated: compensation must contain safe integers.');
  });
});

function createPolicy(rules: readonly ApprovalRule[] = approvalRules): ApprovalPolicy {
  return new ApprovalPolicy({ rules, currencyConverter, compensationPolicy });
}

function createRejectingRule(sequence: number, code: RejectionCode, calls: number[]): ApprovalRule {
  return (): readonly RejectionReason[] => {
    calls.push(sequence);
    return [{ code, field: 'test', message: 'Rejected by a test rule.' }];
  };
}

function expectReasonCodes(
  decision: ApprovalDecision,
  expectedCodes: readonly RejectionCode[],
): void {
  const reasonCodes = rejectedDecision(decision).reasons.map((reason) => reason.code);

  expect(reasonCodes).toHaveLength(new Set(reasonCodes).size);
  expect(reasonCodes).toHaveLength(expectedCodes.length);
  expect(new Set(reasonCodes)).toEqual(new Set(expectedCodes));
}

function rejectedDecision(
  decision: ApprovalDecision,
): Extract<ApprovalDecision, { status: 'rejected' }> {
  if (decision.status !== 'rejected') {
    throw new Error('Expected the approval policy to reject the candidate.');
  }

  return decision;
}

function normalizeFixtureRecord(sourceIndex: number): NormalizedJobCandidate {
  const payload = readFixtureRecord(sourceIndex);
  const envelope: RawJobEnvelope = {
    id: `jobs.json:${sourceIndex}`,
    sourceId: 'jobs.json',
    source: 'jobs.json',
    sourceIndex,
    payload,
  };
  const candidate = normalizeJob(envelope);

  if (candidate === null) {
    throw new Error(`Expected fixture record ${sourceIndex} to normalize.`);
  }

  return candidate;
}

function readFixtureRecord(sourceIndex: number): Record<string, unknown> {
  const fixtureUrl = new URL('../../../../data/jobs.json', import.meta.url);
  const parsed: unknown = JSON.parse(readFileSync(fixtureUrl, 'utf8'));

  if (!Array.isArray(parsed)) {
    throw new Error('Expected data/jobs.json to contain an array.');
  }

  const record: unknown = parsed[sourceIndex];

  if (!isRecord(record)) {
    throw new Error(`Expected fixture record ${sourceIndex} to be an object.`);
  }

  return record;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
