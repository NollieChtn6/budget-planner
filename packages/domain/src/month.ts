/**
 * A budgeting month is an "AAAA-MM" value (ADR-0007): the domain never
 * handles JS `Date`, and the current month is always supplied by the caller
 * rather than read from the system clock.
 */
export type Month = {
  readonly __brand: "Month";
  readonly year: number;
  readonly monthNumber: number;
};

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

export function parseMonth(value: string): Month {
  const match = MONTH_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`Month must be in AAAA-MM format, got "${value}"`);
  }
  const year = Number(match[1]);
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    throw new RangeError(`Month must be between 01 and 12, got "${value}"`);
  }
  return { __brand: "Month", year, monthNumber };
}

export function formatMonth(month: Month): string {
  return `${month.year.toString().padStart(4, "0")}-${month.monthNumber.toString().padStart(2, "0")}`;
}

function toMonthIndex(month: Month): number {
  return month.year * 12 + (month.monthNumber - 1);
}

function fromMonthIndex(index: number): Month {
  return { __brand: "Month", year: Math.floor(index / 12), monthNumber: (index % 12) + 1 };
}

export function nextMonth(month: Month): Month {
  return fromMonthIndex(toMonthIndex(month) + 1);
}

export function previousMonth(month: Month): Month {
  return fromMonthIndex(toMonthIndex(month) - 1);
}

export function compareMonths(a: Month, b: Month): -1 | 0 | 1 {
  const diff = toMonthIndex(a) - toMonthIndex(b);
  if (diff < 0) return -1;
  if (diff > 0) return 1;
  return 0;
}

export function isMonthBefore(a: Month, b: Month): boolean {
  return compareMonths(a, b) < 0;
}

export function isMonthAfter(a: Month, b: Month): boolean {
  return compareMonths(a, b) > 0;
}

export function isSameMonth(a: Month, b: Month): boolean {
  return compareMonths(a, b) === 0;
}

/** R18's "mois restants": months from `from` to `to`, inclusive of both ends. */
export function inclusiveMonthCount(from: Month, to: Month): number {
  return toMonthIndex(to) - toMonthIndex(from) + 1;
}
