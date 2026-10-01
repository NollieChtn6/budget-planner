import { describe, expect, it } from "vitest";
import { moneyFromEuros, moneyToCents } from "../money";
import {
  computeAllocationBase,
  computeDisposableIncome,
  computeForecastMargin,
  computePercentageEnvelopeBudgets,
  computeUnallocated,
} from "./month-budget";

describe("computeDisposableIncome", () => {
  it("deducts fixed entries from income (E1: 2 800€ income, 1 800€ fixed -> 1 000€)", () => {
    const disposableIncome = computeDisposableIncome(moneyFromEuros(2800), [
      moneyFromEuros(1400),
      moneyFromEuros(400),
    ]);
    expect(moneyToCents(disposableIncome)).toBe(moneyToCents(moneyFromEuros(1000)));
  });

  it("returns the full income when there are no fixed entries", () => {
    expect(moneyToCents(computeDisposableIncome(moneyFromEuros(1000), []))).toBe(
      moneyToCents(moneyFromEuros(1000)),
    );
  });
});

describe("computeAllocationBase", () => {
  it("deducts amount-mode envelopes from disposable income (E2: 1 000€ - 150€ -> 850€)", () => {
    const allocationBase = computeAllocationBase(moneyFromEuros(1000), [moneyFromEuros(150)]);
    expect(moneyToCents(allocationBase)).toBe(moneyToCents(moneyFromEuros(850)));
  });

  it("can go negative when amount-mode envelopes exceed disposable income (R13)", () => {
    const allocationBase = computeAllocationBase(moneyFromEuros(100), [moneyFromEuros(150)]);
    expect(moneyToCents(allocationBase)).toBe(moneyToCents(moneyFromEuros(-50)));
  });
});

describe("computePercentageEnvelopeBudgets", () => {
  it("applies each percentage to the allocation base (E2: 850€ base, 15%/15% -> 127,50€/127,50€)", () => {
    const budgets = computePercentageEnvelopeBudgets(moneyFromEuros(850), [15, 15]);
    expect(budgets.map(moneyToCents)).toEqual([12750, 12750]);
  });

  it("zeroes every percentage envelope when the allocation base is negative (R13)", () => {
    const budgets = computePercentageEnvelopeBudgets(moneyFromEuros(-50), [15, 15]);
    expect(budgets.map(moneyToCents)).toEqual([0, 0]);
  });

  it("returns an empty list when there are no percentage envelopes", () => {
    expect(computePercentageEnvelopeBudgets(moneyFromEuros(850), [])).toEqual([]);
  });
});

describe("computeUnallocated", () => {
  it("is the allocation base minus percentage budgets (E2: 850€ - 255€ -> 595€)", () => {
    const unallocated = computeUnallocated(moneyFromEuros(850), [
      moneyFromEuros(127.5),
      moneyFromEuros(127.5),
    ]);
    expect(moneyToCents(unallocated)).toBe(moneyToCents(moneyFromEuros(595)));
  });

  it("equals the full allocation base when there are no percentage envelopes", () => {
    expect(moneyToCents(computeUnallocated(moneyFromEuros(850), []))).toBe(
      moneyToCents(moneyFromEuros(850)),
    );
  });
});

describe("computeForecastMargin", () => {
  it("deducts envelope budgets and every provision's target, reserves included (E4: 408,33€)", () => {
    const margin = computeForecastMargin(
      moneyFromEuros(1000),
      [moneyFromEuros(150), moneyFromEuros(127.5), moneyFromEuros(127.5)],
      [moneyFromEuros(66.67), moneyFromEuros(70), moneyFromEuros(50)],
    );
    expect(moneyToCents(margin)).toBe(moneyToCents(moneyFromEuros(408.33)));
  });

  it("can go negative without being clamped (R14: a warning, never a block)", () => {
    const margin = computeForecastMargin(moneyFromEuros(100), [moneyFromEuros(150)], []);
    expect(moneyToCents(margin)).toBe(moneyToCents(moneyFromEuros(-50)));
  });
});
