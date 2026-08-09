declare const isoDateBrand: unique symbol;

export type IsoDate = string & {
  readonly [isoDateBrand]: 'IsoDate';
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export function createIsoDate(value: string): IsoDate | null {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    return null;
  }

  return value as IsoDate;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }

  return 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
