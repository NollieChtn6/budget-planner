import { type CalendarDate, formatCalendarDate, parseCalendarDate } from "@budget/domain";

/** First-of-day UTC Date, the Prisma-side representation of a CalendarDate (ADR-0007). */
export function calendarDateToDate(date: CalendarDate): Date {
  return new Date(`${formatCalendarDate(date)}T00:00:00.000Z`);
}

export function dateToCalendarDate(date: Date): CalendarDate {
  return parseCalendarDate(date.toISOString().slice(0, 10));
}
