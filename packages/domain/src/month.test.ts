import { describe, expect, it } from "vitest";
import { ceilDivideMoney, moneyFromCents, moneyFromEuros, moneyToCents } from "./money";
import {
  compareMonths,
  formatMonth,
  inclusiveMonthCount,
  isMonthAfter,
  isMonthBefore,
  isSameMonth,
  nextMonth,
  parseMonth,
  previousMonth,
} from "./month";

describe("parseMonth", () => {
  it("parses the first month of a year", () => {
    expect(formatMonth(parseMonth("2026-01"))).toBe("2026-01");
  });

  it("parses the last month of a year", () => {
    expect(formatMonth(parseMonth("2026-12"))).toBe("2026-12");
  });

  it.each(["2026-13", "2026-00", "26-01", "2026-1", "2026/01", ""])(
    "throws on malformed input %s",
    (value) => {
      expect(() => parseMonth(value)).toThrow();
    },
  );
});

describe("formatMonth", () => {
  it("round-trips through parseMonth", () => {
    expect(formatMonth(parseMonth("2026-09"))).toBe("2026-09");
  });
});

describe("nextMonth", () => {
  it("advances within a year", () => {
    expect(formatMonth(nextMonth(parseMonth("2026-01")))).toBe("2026-02");
  });

  it("rolls over to the next year", () => {
    expect(formatMonth(nextMonth(parseMonth("2026-12")))).toBe("2027-01");
  });
});

describe("previousMonth", () => {
  it("goes back within a year", () => {
    expect(formatMonth(previousMonth(parseMonth("2026-02")))).toBe("2026-01");
  });

  it("rolls back to the previous year", () => {
    expect(formatMonth(previousMonth(parseMonth("2026-01")))).toBe("2025-12");
  });
});

describe("compareMonths / isMonthBefore / isMonthAfter / isSameMonth", () => {
  it("orders months within the same year", () => {
    const jan = parseMonth("2026-01");
    const feb = parseMonth("2026-02");
    expect(compareMonths(jan, feb)).toBe(-1);
    expect(compareMonths(feb, jan)).toBe(1);
    expect(isMonthBefore(jan, feb)).toBe(true);
    expect(isMonthAfter(feb, jan)).toBe(true);
  });

  it("orders months across years", () => {
    const dec2026 = parseMonth("2026-12");
    const jan2027 = parseMonth("2027-01");
    expect(isMonthBefore(dec2026, jan2027)).toBe(true);
    expect(isMonthAfter(jan2027, dec2026)).toBe(true);
  });

  it("treats the same month as equal", () => {
    const a = parseMonth("2026-06");
    const b = parseMonth("2026-06");
    expect(compareMonths(a, b)).toBe(0);
    expect(isSameMonth(a, b)).toBe(true);
    expect(isMonthBefore(a, b)).toBe(false);
    expect(isMonthAfter(a, b)).toBe(false);
  });
});

describe("inclusiveMonthCount", () => {
  it("counts a single month as 1", () => {
    const month = parseMonth("2026-03");
    expect(inclusiveMonthCount(month, month)).toBe(1);
  });

  it("counts 6 months inclusive (E3: Orthodontie, 6-month duration)", () => {
    expect(inclusiveMonthCount(parseMonth("2026-01"), parseMonth("2026-06"))).toBe(6);
  });

  it("counts 10 months inclusive (E3: Vacances, 10-month duration)", () => {
    expect(inclusiveMonthCount(parseMonth("2026-01"), parseMonth("2026-10"))).toBe(10);
  });
});

describe("R18 example E3", () => {
  it("computes the first month's target for a 400€ / 6-month deadline provision", () => {
    const startMonth = parseMonth("2026-01");
    // dueMonth = startMonth + durationMonths - 1 (R17); built directly here since
    // Provision isn't implemented yet.
    let dueMonth = startMonth;
    for (let i = 0; i < 5; i++) {
      dueMonth = nextMonth(dueMonth);
    }
    expect(formatMonth(dueMonth)).toBe("2026-06");

    const monthsRemaining = inclusiveMonthCount(startMonth, dueMonth);
    expect(monthsRemaining).toBe(6);

    const target = ceilDivideMoney(moneyFromEuros(400), monthsRemaining);
    expect(moneyToCents(target)).toBe(6667);
    expect(moneyToCents(target)).not.toBe(moneyToCents(moneyFromCents(6666)));
  });
});
