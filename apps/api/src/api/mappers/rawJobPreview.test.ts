import {
  rawJobPreviewMaxDepth,
  rawJobPreviewMaxEntries,
  rawJobPreviewMaxKeyLength,
  rawJobPreviewMaxStringLength,
  rejectedJobsResponseSchema,
} from '@offerminator/api-contracts';
import { describe, expect, it } from 'vitest';

import { createRawJobPreview } from './rawJobPreview.js';

describe('raw job preview', () => {
  it('preserves a small JSON value without marking it as truncated', () => {
    const raw = {
      title: 'Backend Engineer',
      remote: true,
      salary: { amount: 120_000, currency: 'USD' },
    };

    expect(createRawJobPreview(raw)).toEqual({ value: raw, truncated: false });
  });

  it('bounds a valid JSON value nested far beyond the transport depth', () => {
    const nestingDepth = 10_000;
    const json = `${'{"nested":'.repeat(nestingDepth)}"leaf"${'}'.repeat(nestingDepth)}`;
    const raw: unknown = JSON.parse(json);

    const preview = createRawJobPreview(raw);
    const serializedPreview = JSON.stringify(preview.value);

    expect(preview.truncated).toBe(true);
    expect(serializedPreview).toContain('[Raw preview truncated]');
    expect(serializedPreview.length).toBeLessThan(json.length);
    expect(serializedPreview.match(/nested/gu)).toHaveLength(rawJobPreviewMaxDepth);
  });

  it('limits array entries before visiting the entire wide value', () => {
    const raw = Array.from({ length: rawJobPreviewMaxEntries + 10 }, (_, index) => index);

    const preview = createRawJobPreview(raw);

    expect(preview.truncated).toBe(true);
    expect(preview.value).toEqual(raw.slice(0, rawJobPreviewMaxEntries));
  });

  it('shares one entry budget across nested containers and produces a valid response preview', () => {
    const first = Array.from({ length: 60 }, (_, index) => index);
    const second = Array.from({ length: 60 }, (_, index) => index + first.length);
    const preview = createRawJobPreview({ first, second });
    const remainingSecondEntries = rawJobPreviewMaxEntries - 2 - first.length;

    expect(preview).toEqual({
      value: {
        first,
        second: second.slice(0, remainingSecondEntries),
      },
      truncated: true,
    });

    expect(
      rejectedJobsResponseSchema.safeParse({
        items: [
          {
            id: 'synthetic:wide',
            title: null,
            company: null,
            source: 'synthetic.json',
            sourceIndex: 0,
            reasons: [
              {
                code: 'INVALID_RECORD_SHAPE',
                field: 'record',
                message: 'Record must be a JSON object.',
              },
            ],
            raw: preview.value,
            rawPreviewTruncated: preview.truncated,
          },
        ],
        total: 1,
      }).success,
    ).toBe(true);
  });

  it('limits long strings and omits oversized property keys', () => {
    const oversizedKey = 'k'.repeat(rawJobPreviewMaxKeyLength + 1);
    const oversizedString = 'x'.repeat(rawJobPreviewMaxStringLength + 1);
    const raw = Object.fromEntries([
      ['message', oversizedString],
      [oversizedKey, 'secret'],
    ]);

    const preview = createRawJobPreview(raw);
    const serializedPreview = JSON.stringify(preview.value);

    expect(preview.truncated).toBe(true);
    expect(serializedPreview).not.toContain(oversizedKey);
    expect(serializedPreview).not.toContain('secret');

    if (
      typeof preview.value !== 'object' ||
      preview.value === null ||
      Array.isArray(preview.value)
    ) {
      throw new Error('Expected an object preview.');
    }

    const message: unknown = Reflect.get(preview.value, 'message');

    expect(message).toHaveLength(rawJobPreviewMaxStringLength);
    expect(message).toMatch(/… \[truncated\]$/u);
  });
});
