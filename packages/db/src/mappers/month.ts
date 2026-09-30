import { formatMonth, type Month, parseMonth } from "@budget/domain";

/** First-of-month UTC Date, the Prisma-side representation of a Month (ADR-0007). */
export function monthToDate(month: Month): Date {
  return new Date(`${formatMonth(month)}-01T00:00:00.000Z`);
}

export function dateToMonth(date: Date): Month {
  return parseMonth(date.toISOString().slice(0, 7));
}
