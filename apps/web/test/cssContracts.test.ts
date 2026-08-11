// @vitest-environment node

import { glob, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';
import type { AtRule, Declaration } from 'postcss';
import { describe, expect, it } from 'vitest';

import { createViteConfig } from '../vite.config.js';

interface CssSource {
  readonly contents: string;
  readonly relativePath: string;
}

interface BreakpointDefinition {
  readonly name: string;
  readonly widthRem: number;
}

const SOURCE_ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const BREAKPOINTS_PATH = 'styles/breakpoints.css';
const GLOBAL_STYLES_PATH = 'styles/global.css';
const FORCED_COLORS_MEDIA_CONDITION = '(forced-colors: active)';

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
    expect(definedNames.size).toBe(definitions.length);
    expect(definitions.every(({ name }) => name.startsWith('--viewport-'))).toBe(true);

    for (let index = 1; index < definitions.length; index += 1) {
      const previous = definitions[index - 1];
      const current = definitions[index];

      if (previous === undefined || current === undefined) {
        throw new Error('Breakpoint definition order is incomplete.');
      }

      expect(current.widthRem).toBeGreaterThan(previous.widthRem);
    }

    for (const source of sources) {
      expect(source.contents).not.toMatch(/@media\s*\(\s*max-width\s*:/u);

      if (source.relativePath === BREAKPOINTS_PATH) {
        continue;
      }

      expect(source.contents).not.toContain('@custom-media');
      expect(source.contents).not.toMatch(/@media\s*\([^)]*\b(?:min|max)-width\s*:/u);

      for (const condition of readMediaConditions(source.contents)) {
        if (condition === FORCED_COLORS_MEDIA_CONDITION) {
          continue;
        }

        expect(condition).toMatch(/^\(--viewport-[a-z-]+\)$/u);
        expect(definedNames.has(readCustomMediaName(condition))).toBe(true);
      }

      for (const { widthRem } of definitions) {
        expect(source.contents).not.toContain(`${String(widthRem)}rem`);
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

    expect(result.css).toContain(`@media (min-width: ${String(breakpoint.widthRem)}rem)`);
    expect(result.css).not.toMatch(/@media\s*\(\s*--viewport-/u);
  });

  it('keeps CSS pixels only for technical rendering details', async () => {
    const sources = await readCssSources();
    const violations: string[] = [];

    for (const source of sources) {
      const root = postcss.parse(source.contents, { from: source.relativePath });

      root.walkDecls((declaration) => {
        if (declaration.value.includes('px') && !isAllowedCssPixelDeclaration(declaration)) {
          violations.push(`${source.relativePath}: ${declaration.toString()}`);
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it('restores a system outline when forced colors remove the regular focus ring', async () => {
    const contents = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');
    const root = postcss.parse(contents, { from: GLOBAL_STYLES_PATH });
    let forcedColorsRule: AtRule | undefined;

    root.walkAtRules('media', (rule) => {
      if (rule.params === FORCED_COLORS_MEDIA_CONDITION) {
        forcedColorsRule = rule;
      }
    });

    expect(forcedColorsRule).toBeDefined();

    if (forcedColorsRule === undefined) {
      throw new Error('Missing forced-colors focus fallback.');
    }

    const ruleText = forcedColorsRule.toString();

    for (const selector of ['button', 'input', 'select', 'summary', 'pre']) {
      expect(ruleText).toContain(`${selector}:focus-visible`);
    }

    expect(ruleText).toMatch(/outline:\s*2px solid CanvasText;/u);
    expect(ruleText).toMatch(/outline-offset:\s*2px;/u);
    expect(ruleText).toMatch(/box-shadow:\s*none;/u);
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
  return [
    ...contents.matchAll(/@custom-media\s+(--[a-z-]+)\s+\(min-width:\s*(\d+(?:\.\d+)?)rem\);/gu),
  ].map(([, name, widthRem]) => {
    if (name === undefined || widthRem === undefined) {
      throw new Error('Breakpoint definition is incomplete.');
    }

    return { name, widthRem: Number(widthRem) };
  });
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

function isAllowedCssPixelDeclaration(declaration: Declaration): boolean {
  const values = [...declaration.value.matchAll(/(-?\d+(?:\.\d+)?)px/gu)].map(([, value]) =>
    Number(value),
  );

  if (values.length === 0) {
    return true;
  }

  if (/^border(?:-(?:top|right|bottom|left))?$/u.test(declaration.prop)) {
    return values.every((value) => value === 1 || value === 3);
  }

  if (declaration.prop === 'outline' || declaration.prop === 'outline-offset') {
    return values.every((value) => value === 2);
  }

  if (declaration.prop === 'box-shadow' || declaration.prop === '--focus-ring') {
    return values.every((value) => value === 2 || value === 5);
  }

  if (declaration.prop === 'width' || declaration.prop === 'height') {
    return values.every((value) => value === 1);
  }

  if (declaration.prop === 'margin') {
    return values.every((value) => value === -1);
  }

  return false;
}
