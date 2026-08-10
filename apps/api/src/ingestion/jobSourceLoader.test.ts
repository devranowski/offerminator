import { describe, expect, it } from 'vitest';

import {
  FileSystemJobSourceLoader,
  type SourceErrorCode,
  type Utf8FileReader,
} from './jobSourceLoader.js';

describe('FileSystemJobSourceLoader', () => {
  it('loads ordered unknown records and exposes only the source basename', async () => {
    const loader = new FileSystemJobSourceLoader(() =>
      Promise.resolve('[{"title":"First"},42,null,"last"]'),
    );

    await expect(loader.loadSources(['/absolute/input/jobs.json'])).resolves.toEqual([
      {
        ok: true,
        source: 'jobs.json',
        records: [{ title: 'First' }, 42, null, 'last'],
      },
    ]);
  });

  it('isolates source failures and preserves configured source order', async () => {
    const contentsByPath = new Map([
      ['/input/first.json', '[1]'],
      ['/input/broken.json', '{'],
      ['/input/last.json', '[3]'],
    ]);
    const reader: Utf8FileReader = (path) => {
      const contents = contentsByPath.get(path);

      return contents === undefined
        ? Promise.reject(Object.assign(new Error('missing'), { code: 'ENOENT' }))
        : Promise.resolve(contents);
    };
    const loader = new FileSystemJobSourceLoader(reader);

    await expect(
      loader.loadSources(['/input/first.json', '/input/broken.json', '/input/last.json']),
    ).resolves.toEqual([
      {
        ok: true,
        source: 'first.json',
        records: [1],
      },
      {
        ok: false,
        error: {
          source: 'broken.json',
          code: 'INVALID_JSON',
          message: 'Source file does not contain valid JSON.',
        },
      },
      {
        ok: true,
        source: 'last.json',
        records: [3],
      },
    ]);
  });

  it.each([
    {
      name: 'missing file',
      expectedCode: 'FILE_NOT_FOUND',
      reader: () => Promise.reject(Object.assign(new Error('missing'), { code: 'ENOENT' })),
    },
    {
      name: 'invalid JSON',
      expectedCode: 'INVALID_JSON',
      reader: () => Promise.resolve('{'),
    },
    {
      name: 'non-array root',
      expectedCode: 'ROOT_NOT_ARRAY',
      reader: () => Promise.resolve('{"title":"Not an array"}'),
    },
    {
      name: 'other read failure',
      expectedCode: 'READ_ERROR',
      reader: () => Promise.reject(Object.assign(new Error('denied'), { code: 'EACCES' })),
    },
  ] satisfies ReadonlyArray<{
    readonly name: string;
    readonly expectedCode: SourceErrorCode;
    readonly reader: Utf8FileReader;
  }>)('maps $name to $expectedCode', async ({ expectedCode, reader }) => {
    const loader = new FileSystemJobSourceLoader(reader);
    const [result] = await loader.loadSources(['/input/source.json']);

    expect(result).toMatchObject({
      ok: false,
      error: {
        source: 'source.json',
        code: expectedCode,
      },
    });
  });
});
