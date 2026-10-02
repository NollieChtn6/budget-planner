import { type Month, parseMonth } from "./month";

/**
 * A calendar day, with no time or timezone (ADR-0007): the domain never
 * handles JS `Date`, so calendar arithmetic (day-in-month, leap years) is
 * done by hand instead of delegating to it.
 */
export type CalendarDate = {
  readonly __brand: "CalendarDate";
  readonly year: number;
  readonly month: number;
  readonly day: number;
};

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return DAYS_IN_MONTH[month - 1] as number;
}

export function parseCalendarDate(value: string): CalendarDate {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(`Date must be in AAAA-MM-DD format, got "${value}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) {
    throw new RangeError(`Month must be between 01 and 12, got "${value}"`);
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    throw new RangeError(
      `Day is out of range for ${year}-${String(month).padStart(2, "0")}, got "${value}"`,
    );
  }
  return { __brand: "CalendarDate", year, month, day };
}

export function formatCalendarDate(date: CalendarDate): string {
  return `${date.year.toString().padStart(4, "0")}-${date.month.toString().padStart(2, "0")}-${date.day.toString().padStart(2, "0")}`;
}

/** R3: the budget month a date is attached to. */
export function monthOfCalendarDate(date: CalendarDate): Month {
  return parseMonth(
    `${date.year.toString().padStart(4, "0")}-${date.month.toString().padStart(2, "0")}`,
  );
}

export function compareCalendarDates(a: CalendarDate, b: CalendarDate): -1 | 0 | 1 {
  const diff = a.year * 10000 + a.month * 100 + a.day - (b.year * 10000 + b.month * 100 + b.day);
  if (diff < 0) return -1;
  if (diff > 0) return 1;
  return 0;
}

export function firstDayOfMonth(month: Month): CalendarDate {
  return { __brand: "CalendarDate", year: month.year, month: month.monthNumber, day: 1 };
}

export function lastDayOfMonth(month: Month): CalendarDate {
  return {
    __brand: "CalendarDate",
    year: month.year,
    month: month.monthNumber,
    day: daysInMonth(month.year, month.monthNumber),
  };
}
