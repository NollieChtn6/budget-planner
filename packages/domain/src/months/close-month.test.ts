import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "../calendar-date";
import { moneyFromEuros, moneyToEuros } from "../money";
import {
  type CloseMonthInput,
  closeMonth,
  computeLeftover,
  computeSavingsFundedAmount,
  reopenMonth,
} from "./close-month";

describe("computeLeftover (R24)", () => {
  it("E16: -60€, +20€, 0€ sums to a -40€ leftover", () => {
    const leftover = computeLeftover([moneyFromEuros(-60), moneyFromEuros(20), moneyFromEuros(0)]);
    expect(moneyToEuros(leftover)).toBe(-40);
  });

  it("is 0 with no envelopes", () => {
    expect(moneyToEuros(computeLeftover([]))).toBe(0);
  });
});

describe("computeSavingsFundedAmount (R30)", () => {
  it("E16: a -40€ leftover is 40€ financed by savings", () => {
    expect(moneyToEuros(computeSavingsFundedAmount(moneyFromEuros(-40)))).toBe(40);
  });

  it("is 0 when the leftover is positive or zero", () => {
    expect(moneyToEuros(computeSavingsFundedAmount(moneyFromEuros(40)))).toBe(0);
    expect(moneyToEuros(computeSavingsFundedAmount(moneyFromEuros(0)))).toBe(0);
  });
});

function baseInput(overrides: Partial<CloseMonthInput> = {}): CloseMonthInput {
  return {
    date: parseCalendarDate("2026-10-31"),
    allocations: [],
    snapshotProvisionIds: ["p1"],
    ...overrides,
  };
}

describe("closeMonth (R25, R26)", () => {
  it("accepts a split toward savings and a provision, creating a closing contribution", () => {
    const result = closeMonth(
      baseInput({
        allocations: [
          { destination: "savings", amount: moneyFromEuros(50) },
          { destination: "provision", provisionId: "p1", amount: moneyFromEuros(100) },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.allocations).toHaveLength(2);
      expect(result.contributions).toEqual([
        {
          date: parseCalendarDate("2026-10-31"),
          amount: moneyFromEuros(100),
          provisionId: "p1",
          origin: "closing",
        },
      ]);
    }
  });

  it("E13: never rejects allocations that total more than the leftover", () => {
    const result = closeMonth(
      baseInput({ allocations: [{ destination: "savings", amount: moneyFromEuros(225) }] }),
    );
    expect(result.ok).toBe(true);
  });

  it("accepts no allocation at all", () => {
    const result = closeMonth(baseInput());
    expect(result).toEqual({ ok: true, allocations: [], contributions: [] });
  });

  it("rejects a zero allocation amount", () => {
    const result = closeMonth(
      baseInput({ allocations: [{ destination: "savings", amount: moneyFromEuros(0) }] }),
    );
    expect(result).toEqual({ ok: false, error: { type: "invalidAllocationAmount" } });
  });

  it("rejects a provision outside this month's snapshot", () => {
    const result = closeMonth(
      baseInput({
        allocations: [
          { destination: "provision", provisionId: "unknown", amount: moneyFromEuros(10) },
        ],
      }),
    );
    expect(result).toEqual({ ok: false, error: { type: "provisionNotInSnapshot" } });
  });
});

describe("reopenMonth (R29)", () => {
  it("accepts a closed month", () => {
    expect(reopenMonth("closed")).toEqual({ ok: true });
  });

  it("rejects a month that isn't closed", () => {
    expect(reopenMonth("open")).toEqual({ ok: false, error: { type: "notClosed" } });
  });
});
