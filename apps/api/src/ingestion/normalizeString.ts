function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  return normalized.length === 0 ? null : normalized;
}

export { normalizeOptionalString };
