import { describe, expect, it } from "vitest";
import { moneyFromEuros, moneyToEuros } from "../money";
import { computeConsumptionLevel, computeRemaining, computeSpent } from "./envelope-consumption";

describe("computeSpent", () => {
  it("sums the month's expense amounts", () => {
    expect(moneyToEuros(computeSpent([moneyFromEuros(10), moneyFromEuros(2.5)]))).toBe(12.5);
  });

  it("is zero with no expenses", () => {
    expect(moneyToEuros(computeSpent([]))).toBe(0);
  });
});

describe("computeRemaining", () => {
  it("can go negative when overspent", () => {
    expect(moneyToEuros(computeRemaining(moneyFromEuros(100), moneyFromEuros(140)))).toBe(-40);
  });
});

describe("computeConsumptionLevel (R16)", () => {
  const budget = moneyFromEuros(127.5);

  it.each([
    [0, "ok"],
    [60, "ok"],
    [63.75, "watch"],
    [70, "watch"],
    [76.5, "caution"],
    [90, "caution"],
    [95.7, "warning"],
    [100, "warning"],
    [108.4, "critical"],
    [127.5, "critical"],
    [140, "exceeded"],
  ])("spending %s€ on a 127.50€ budget gives level %s", (spentEuros, level) => {
    expect(computeConsumptionLevel(budget, moneyFromEuros(spentEuros))).toBe(level);
  });

  it("E8: 100€ spent gives warning with 27.50€ remaining", () => {
    expect(computeConsumptionLevel(budget, moneyFromEuros(100))).toBe("warning");
    expect(moneyToEuros(computeRemaining(budget, moneyFromEuros(100)))).toBe(27.5);
  });

  it("E9: 140€ spent gives exceeded with -12.50€ remaining", () => {
    expect(computeConsumptionLevel(budget, moneyFromEuros(140))).toBe("exceeded");
    expect(moneyToEuros(computeRemaining(budget, moneyFromEuros(140)))).toBe(-12.5);
  });

  it("treats a zero or negative budget as ok when nothing was spent, exceeded otherwise", () => {
    expect(computeConsumptionLevel(moneyFromEuros(0), moneyFromEuros(0))).toBe("ok");
    expect(computeConsumptionLevel(moneyFromEuros(0), moneyFromEuros(1))).toBe("exceeded");
  });
});
