import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

type UnknownRecord = Record<string, unknown>;

const expectedTitles = [
  'Backend Engineer',
  'Frontend Developer Intern',
  'Machine Learning Engineer',
  'Agile Project Lead',
  'DevOps Consultant',
  'Senior Software Engineer',
  'Junior Developer',
  'Data Scientist',
  'Project Manager',
  'QA Automation Engineer',
  'UX Designer',
  'Product Analyst',
  'Mobile Engineer',
  'Technical Writer',
  'Cybersecurity Specialist',
  'Growth Marketing Manager',
  'Database Administrator',
  'Business Operations Associate',
  'Customer Success Manager',
  '',
];

describe('data/jobs.json fixture integrity', () => {
  it('preserves the source records, order, and corner cases', () => {
    const records = readFixture();

    expect(records).toHaveLength(20);
    expect(records.map((record) => record['title'])).toEqual(expectedTitles);
    expect(records[0]?.['title']).toBe('Backend Engineer');
    expect(records[19]?.['company']).toBe('OpsFlex');
    expect(records[6]?.['language']).toBe('');
    expect(records[7]?.['salary']).toBe(62.5);
    expect(records[10]?.['location']).toMatchObject({ city: '' });
    expect(records[12]?.['location']).toMatchObject({ state: '' });
    expect(records[15]?.['posting_date']).toBe('');
    expect(records[19]?.['title']).toBe('');
    expect(records[19]?.['location']).toBeNull();
  });
});

function readFixture(): UnknownRecord[] {
  const fixtureUrl = new URL('../../../data/jobs.json', import.meta.url);
  const parsed: unknown = JSON.parse(readFileSync(fixtureUrl, 'utf8'));

  if (!Array.isArray(parsed)) {
    throw new Error('Expected data/jobs.json to contain a JSON array.');
  }

  return parsed.map((record: unknown, index) => {
    if (!isRecord(record)) {
      throw new Error(`Expected fixture record ${index} to be a JSON object.`);
    }

    return record;
  });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
