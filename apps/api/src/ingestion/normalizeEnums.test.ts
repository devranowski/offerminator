import { describe, expect, it } from 'vitest';

import {
  normalizeCompanyType,
  normalizeEmploymentType,
  normalizeLanguage,
} from './normalizeEnums.js';

describe('normalizeEmploymentType', () => {
  it.each([
    [' Full-Time ', 'full-time'],
    ['PART-TIME', 'part-time'],
    ['Contract', 'contract'],
    ['Internship', 'internship'],
  ] as const)('maps %j to %s', (value, expected) => {
    expect(normalizeEmploymentType(value)).toBe(expected);
  });

  it.each([undefined, null, '', 'Permanent', 42])('maps %j to unknown', (value) => {
    expect(normalizeEmploymentType(value)).toBe('unknown');
  });
});

describe('normalizeCompanyType', () => {
  it.each([
    [' Direct Employer ', 'direct-employer'],
    ['CONSULTING AGENCY', 'consulting-agency'],
    ['Staffing Firm', 'staffing-firm'],
  ] as const)('maps %j to %s', (value, expected) => {
    expect(normalizeCompanyType(value)).toBe(expected);
  });

  it.each([undefined, null, '', 'Marketplace', 42])('maps %j to unknown', (value) => {
    expect(normalizeCompanyType(value)).toBe('unknown');
  });
});

describe('normalizeLanguage', () => {
  it.each([
    [' English ', 'english'],
    ['FRENCH', 'french'],
  ] as const)('maps %j to %s', (value, expected) => {
    expect(normalizeLanguage(value)).toBe(expected);
  });

  it.each([undefined, null, '', '   ', 42])('maps missing value %j to unknown', (value) => {
    expect(normalizeLanguage(value)).toBe('unknown');
  });

  it.each(['German', 'Spanish', 'unknown'])('maps non-supported language %j to other', (value) => {
    expect(normalizeLanguage(value)).toBe('other');
  });
});
