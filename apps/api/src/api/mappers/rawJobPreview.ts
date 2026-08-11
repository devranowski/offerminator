import {
  rawJobPreviewMaxDepth,
  rawJobPreviewMaxEntries,
  rawJobPreviewMaxKeyLength,
  rawJobPreviewMaxStringLength,
  type RawJobPreviewDto,
} from '@offerminator/api-contracts';

interface RawJobPreviewResult {
  readonly value: RawJobPreviewDto;
  readonly truncated: boolean;
}

interface RawJobPreviewState {
  remainingEntries: number;
  truncated: boolean;
  readonly ancestors: WeakSet<object>;
}

const truncationMarker = '[Raw preview truncated]';
const truncationSuffix = '… [truncated]';

function createRawJobPreview(raw: unknown): RawJobPreviewResult {
  const state: RawJobPreviewState = {
    remainingEntries: rawJobPreviewMaxEntries,
    truncated: false,
    ancestors: new WeakSet<object>(),
  };

  return {
    value: projectRawValue(raw, 0, state),
    truncated: state.truncated,
  };
}

function projectRawValue(
  value: unknown,
  depth: number,
  state: RawJobPreviewState,
): RawJobPreviewDto {
  if (value === null || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return limitString(value, state);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'object') {
    return truncateValue(state);
  }

  if (depth >= rawJobPreviewMaxDepth || state.ancestors.has(value)) {
    return truncateValue(state);
  }

  state.ancestors.add(value);

  const preview = Array.isArray(value)
    ? projectArray(value, depth, state)
    : projectObject(value, depth, state);

  state.ancestors.delete(value);

  return preview;
}

function projectArray(
  value: readonly unknown[],
  depth: number,
  state: RawJobPreviewState,
): readonly RawJobPreviewDto[] {
  const preview: RawJobPreviewDto[] = [];

  for (const item of value) {
    if (!consumeEntry(state)) {
      break;
    }

    preview.push(projectRawValue(item, depth + 1, state));
  }

  return preview;
}

function projectObject(value: object, depth: number, state: RawJobPreviewState): RawJobPreviewDto {
  const previewEntries: [string, RawJobPreviewDto][] = [];

  for (const key in value) {
    if (!Object.hasOwn(value, key)) {
      continue;
    }

    if (!consumeEntry(state)) {
      break;
    }

    if (key.length > rawJobPreviewMaxKeyLength) {
      state.truncated = true;
      continue;
    }

    const propertyValue: unknown = Reflect.get(value, key);
    previewEntries.push([key, projectRawValue(propertyValue, depth + 1, state)]);
  }

  return Object.fromEntries(previewEntries);
}

function consumeEntry(state: RawJobPreviewState): boolean {
  if (state.remainingEntries === 0) {
    state.truncated = true;
    return false;
  }

  state.remainingEntries -= 1;
  return true;
}

function limitString(value: string, state: RawJobPreviewState): string {
  if (value.length <= rawJobPreviewMaxStringLength) {
    return value;
  }

  state.truncated = true;

  return `${value.slice(0, rawJobPreviewMaxStringLength - truncationSuffix.length)}${truncationSuffix}`;
}

function truncateValue(state: RawJobPreviewState): string {
  state.truncated = true;
  return truncationMarker;
}

export { createRawJobPreview };
