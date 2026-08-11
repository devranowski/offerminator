import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

export type SourceErrorCode = 'FILE_NOT_FOUND' | 'INVALID_JSON' | 'ROOT_NOT_ARRAY' | 'READ_ERROR';

export interface ConfiguredJobSource {
  readonly sourceId: string;
  readonly path: string;
}

export interface SourceError {
  readonly sourceId: string;
  readonly source: string;
  readonly code: SourceErrorCode;
  readonly message: string;
}

export type SourceLoadResult =
  | {
      readonly ok: true;
      readonly sourceId: string;
      readonly source: string;
      readonly records: readonly unknown[];
    }
  | {
      readonly ok: false;
      readonly error: SourceError;
    };

export interface JobSourceLoader {
  loadSources(sources: readonly ConfiguredJobSource[]): Promise<readonly SourceLoadResult[]>;
}

export type Utf8FileReader = (path: string) => Promise<string>;

const nodeUtf8FileReader: Utf8FileReader = (path) => readFile(path, 'utf8');

const sourceErrorMessages = {
  FILE_NOT_FOUND: 'Source file was not found.',
  INVALID_JSON: 'Source file does not contain valid JSON.',
  ROOT_NOT_ARRAY: 'Source JSON root must be an array.',
  READ_ERROR: 'Source file could not be read.',
} satisfies Record<SourceErrorCode, string>;

export class FileSystemJobSourceLoader implements JobSourceLoader {
  constructor(private readonly readUtf8File: Utf8FileReader = nodeUtf8FileReader) {}

  loadSources(sources: readonly ConfiguredJobSource[]): Promise<readonly SourceLoadResult[]> {
    return Promise.all(sources.map((source) => this.loadSource(source)));
  }

  private async loadSource(configuredSource: ConfiguredJobSource): Promise<SourceLoadResult> {
    const { sourceId, path } = configuredSource;
    const source = basename(path);
    let contents: string;

    try {
      contents = await this.readUtf8File(path);
    } catch (error: unknown) {
      return sourceFailure(
        sourceId,
        source,
        hasErrorCode(error, 'ENOENT') ? 'FILE_NOT_FOUND' : 'READ_ERROR',
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(contents);
    } catch {
      return sourceFailure(sourceId, source, 'INVALID_JSON');
    }

    return Array.isArray(parsed)
      ? { ok: true, sourceId, source, records: parsed }
      : sourceFailure(sourceId, source, 'ROOT_NOT_ARRAY');
  }
}

function sourceFailure(sourceId: string, source: string, code: SourceErrorCode): SourceLoadResult {
  return {
    ok: false,
    error: {
      sourceId,
      source,
      code,
      message: sourceErrorMessages[code],
    },
  };
}

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
