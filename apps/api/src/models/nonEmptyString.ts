declare const nonEmptyStringBrand: unique symbol;

export type NonEmptyString = string & {
  readonly [nonEmptyStringBrand]: 'NonEmptyString';
};

function createNonEmptyString(value: string): NonEmptyString | null {
  if (value.length === 0 || value.trim() !== value) {
    return null;
  }

  return value as NonEmptyString;
}

export { createNonEmptyString };
