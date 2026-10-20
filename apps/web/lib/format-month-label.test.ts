import { parseMonth } from "@budget/domain";
import { describe, expect, it } from "vitest";
import { formatFromMonthLabel, formatMonthLabel } from "./format-month-label";

describe("formatFromMonthLabel", () => {
  it("elides before a vowel", () => {
    expect(formatFromMonthLabel(parseMonth("2026-10"))).toBe("d'octobre 2026");
    expect(formatFromMonthLabel(parseMonth("2026-04"))).toBe("d'avril 2026");
    expect(formatFromMonthLabel(parseMonth("2026-08"))).toBe("d'août 2026");
  });

  it("uses de before a consonant", () => {
    expect(formatFromMonthLabel(parseMonth("2026-11"))).toBe("de novembre 2026");
    expect(formatFromMonthLabel(parseMonth("2027-01"))).toBe("de janvier 2027");
  });
});

describe("formatMonthLabel", () => {
  it("capitalises the month name", () => {
    expect(formatMonthLabel(parseMonth("2026-10"))).toBe("Octobre 2026");
  });
});
