import { describe, expect, it } from 'vitest';

import { loadConfig } from './config.js';

describe('loadConfig', () => {
  it('uses deterministic host and port defaults', () => {
    expect(loadConfig({})).toEqual({
      host: '0.0.0.0',
      port: 3_000,
    });
  });

  it('trims a custom host and parses a custom port', () => {
    expect(
      loadConfig({
        HOST: ' 127.0.0.1 ',
        PORT: '8080',
      }),
    ).toEqual({
      host: '127.0.0.1',
      port: 8_080,
    });
  });

  it.each([
    { HOST: '', PORT: '3000' },
    { HOST: '   ', PORT: '3000' },
    { HOST: '127.0.0.1', PORT: '0' },
    { HOST: '127.0.0.1', PORT: '65536' },
    { HOST: '127.0.0.1', PORT: '3000.5' },
    { HOST: '127.0.0.1', PORT: 'not-a-number' },
  ])('rejects invalid environment values %#', (environment) => {
    expect(() => loadConfig(environment)).toThrow();
  });
});
