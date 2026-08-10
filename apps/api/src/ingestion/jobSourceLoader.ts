import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

export type SourceErrorCode = 'FILE_NOT_FOUND' | 'INVALID_JSON' | 'ROOT_NOT_ARRAY' | 'READ_ERROR';

export interface SourceError {
  readonly source: string;
  readonly code: SourceErrorCode;
  readonly message: string;
}

export type SourceLoadResult =
  | {
      readonly ok: true;
      readonly source: string;
      readonly records: readonly unknown[];
    }
  | {
      readonly ok: false;
      readonly error: SourceError;
    };

export interface JobSourceLoader {
  loadSources(paths: readonly string[]): Promise<readonly SourceLoadResult[]>;
}

export type Utf8FileReader = (path: string) => Promise<string>;

const nodeUtf8FileReader: Utf8FileReader = (path) => readFile(path, 'utf8');

export class FileSystemJobSourceLoader implements JobSourceLoader {
  constructor(private readonly readUtf8File: Utf8FileReader = nodeUtf8FileReader) {}

  loadSources(paths: readonly string[]): Promise<readonly SourceLoadResult[]> {
    return Promise.all(paths.map((path) => this.loadSource(path)));
  }

  private async loadSource(path: string): Promise<SourceLoadResult> {
    const source = basename(path);
    let contents: string;

    try {
      contents = await this.readUtf8File(path);
    } catch (error: unknown) {
      return sourceFailure(source, hasErrorCode(error, 'ENOENT') ? 'FILE_NOT_FOUND' : 'READ_ERROR');
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(contents);
    } catch {
      return sourceFailure(source, 'INVALID_JSON');
    }

    return Array.isArray(parsed)
      ? { ok: true, source, records: parsed }
      : sourceFailure(source, 'ROOT_NOT_ARRAY');
  }
}

const sourceErrorMessages = {
  FILE_NOT_FOUND: 'Source file was not found.',
  INVALID_JSON: 'Source file does not contain valid JSON.',
  ROOT_NOT_ARRAY: 'Source JSON root must be an array.',
  READ_ERROR: 'Source file could not be read.',
} satisfies Record<SourceErrorCode, string>;

function sourceFailure(source: string, code: SourceErrorCode): SourceLoadResult {
  return {
    ok: false,
    error: {
      source,
      code,
      message: sourceErrorMessages[code],
    },
  };
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
