// @vitest-environment node

import { glob, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { createViteConfig } from '../vite.config.js';

interface CssSource {
  readonly contents: string;
  readonly relativePath: string;
}

interface BreakpointDefinition {
  readonly name: string;
  readonly width: number;
}

const SOURCE_ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const BREAKPOINTS_PATH = 'styles/breakpoints.css';

describe('responsive CSS contract', () => {
  it('keeps increasing mobile-first breakpoints in one named source', async () => {
    const sources = await readCssSources();
    const breakpointSource = sources.find((source) => source.relativePath === BREAKPOINTS_PATH);

    expect(breakpointSource).toBeDefined();

    if (breakpointSource === undefined) {
      throw new Error(`Missing ${BREAKPOINTS_PATH}.`);
    }

    const definitions = readBreakpointDefinitions(breakpointSource.contents);
    const definedNames = new Set(definitions.map(({ name }) => name));

    expect(definitions).toHaveLength(3);
    expect(new Set(definitions.map(({ name }) => name)).size).toBe(definitions.length);
    expect(definitions.every(({ name }) => name.startsWith('--viewport-'))).toBe(true);

    for (let index = 1; index < definitions.length; index += 1) {
      const previous = definitions[index - 1];
      const current = definitions[index];

      if (previous === undefined || current === undefined) {
        throw new Error('Breakpoint definition order is incomplete.');
      }

      expect(current.width).toBeGreaterThan(previous.width);
    }

    for (const source of sources) {
      expect(source.contents).not.toMatch(/@media\s*\(\s*max-width\s*:/u);

      if (source.relativePath === BREAKPOINTS_PATH) {
        continue;
      }

      expect(source.contents).not.toContain('@custom-media');
      expect(source.contents).not.toMatch(/@media\s*\([^)]*\b(?:min|max)-width\s*:/u);

      for (const condition of readMediaConditions(source.contents)) {
        expect(condition).toMatch(/^\(--viewport-[a-z-]+\)$/u);
        expect(definedNames.has(readCustomMediaName(condition))).toBe(true);
      }

      for (const { width } of definitions) {
        expect(source.contents).not.toContain(`${String(width)}px`);
      }
    }
  });

  it('compiles named breakpoints through the Vite PostCSS chain', async () => {
    const breakpointContents = await readFile(
      new URL('../src/styles/breakpoints.css', import.meta.url),
      'utf8',
    );
    const [breakpoint] = readBreakpointDefinitions(breakpointContents);

    if (breakpoint === undefined) {
      throw new Error('At least one breakpoint definition is required.');
    }

    const viteConfig = createViteConfig();
    const input = `@media (${breakpoint.name}) { .probe { display: block; } }`;
    const result = await postcss(viteConfig.css.postcss.plugins).process(input, {
      from: undefined,
    });

    expect(result.css).toContain(`@media (min-width: ${String(breakpoint.width)}px)`);
    expect(result.css).not.toMatch(/@media\s*\(\s*--viewport-/u);
  });
});

async function readCssSources(): Promise<readonly CssSource[]> {
  const relativePaths: string[] = [];

  for await (const relativePath of glob('**/*.css', { cwd: SOURCE_ROOT })) {
    relativePaths.push(relativePath);
  }

  return Promise.all(
    relativePaths.sort().map(async (relativePath) => ({
      contents: await readFile(new URL(`../src/${relativePath}`, import.meta.url), 'utf8'),
      relativePath,
    })),
  );
}

function readBreakpointDefinitions(contents: string): readonly BreakpointDefinition[] {
  return [...contents.matchAll(/@custom-media\s+(--[a-z-]+)\s+\(min-width:\s*(\d+)px\);/gu)].map(
    ([, name, width]) => {
      if (name === undefined || width === undefined) {
        throw new Error('Breakpoint definition is incomplete.');
      }

      return { name, width: Number(width) };
    },
  );
}

function readMediaConditions(contents: string): readonly string[] {
  return [...contents.matchAll(/@media\s+([^{]+)\{/gu)].map(([, condition]) => {
    if (condition === undefined) {
      throw new Error('Media query condition is incomplete.');
    }

    return condition.trim();
  });
}

function readCustomMediaName(condition: string): string {
  const match = /^\((--viewport-[a-z-]+)\)$/u.exec(condition);
  const name = match?.[1];

  if (name === undefined) {
    throw new Error(`Invalid custom media condition: ${condition}.`);
  }

  return name;
}
