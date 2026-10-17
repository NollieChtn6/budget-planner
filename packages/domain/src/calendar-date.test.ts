import { describe, expect, it } from "vitest";
import {
  compareCalendarDates,
  firstDayOfMonth,
  formatCalendarDate,
  lastDayOfMonth,
  monthOfCalendarDate,
  parseCalendarDate,
} from "./calendar-date";
import { formatMonth, parseMonth } from "./month";

describe("parseCalendarDate", () => {
  it("round-trips through formatCalendarDate", () => {
    expect(formatCalendarDate(parseCalendarDate("2026-02-28"))).toBe("2026-02-28");
  });

  it("accepts February 29 on a leap year", () => {
    expect(formatCalendarDate(parseCalendarDate("2028-02-29"))).toBe("2028-02-29");
  });

  it("rejects February 29 on a non-leap year", () => {
    expect(() => parseCalendarDate("2026-02-29")).toThrow();
  });

  it.each(["2026-13-01", "2026-04-31", "2026-01-00", "2026-1-01", "2026/01/01", ""])(
    "throws on malformed input %s",
    (value) => {
      expect(() => parseCalendarDate(value)).toThrow();
    },
  );
});

describe("monthOfCalendarDate", () => {
  it("returns the AAAA-MM the day belongs to (R3)", () => {
    expect(formatMonth(monthOfCalendarDate(parseCalendarDate("2026-10-23")))).toBe("2026-10");
  });
});

describe("compareCalendarDates", () => {
  it("orders by year, then month, then day", () => {
    expect(
      compareCalendarDates(parseCalendarDate("2026-10-05"), parseCalendarDate("2026-10-23")),
    ).toBe(-1);
    expect(
      compareCalendarDates(parseCalendarDate("2026-10-23"), parseCalendarDate("2026-10-05")),
    ).toBe(1);
    expect(
      compareCalendarDates(parseCalendarDate("2026-10-23"), parseCalendarDate("2026-10-23")),
    ).toBe(0);
  });
});

describe("firstDayOfMonth / lastDayOfMonth", () => {
  it("returns the first and last calendar day of a 31-day month", () => {
    const month = parseMonth("2026-10");
    expect(formatCalendarDate(firstDayOfMonth(month))).toBe("2026-10-01");
    expect(formatCalendarDate(lastDayOfMonth(month))).toBe("2026-10-31");
  });

  it("accounts for leap years in February", () => {
    expect(formatCalendarDate(lastDayOfMonth(parseMonth("2028-02")))).toBe("2028-02-29");
    expect(formatCalendarDate(lastDayOfMonth(parseMonth("2026-02")))).toBe("2026-02-28");
  });
});
