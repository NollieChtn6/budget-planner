import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "../calendar-date";
import { moneyFromEuros, moneyToCents, moneyToEuros } from "../money";
import {
  type CloseMonthInput,
  closeMonth,
  computeCarriedOver,
  computeEnvelopeBonus,
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
    nextMonthActiveEnvelopeIds: ["e1"],
    nextMonthIsOpen: false,
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

  it("accepts a split toward an envelope and a report (R31, R32), with no contribution created", () => {
    const result = closeMonth(
      baseInput({
        allocations: [
          { destination: "envelope", envelopeId: "e1", amount: moneyFromEuros(20) },
          { destination: "report", amount: moneyFromEuros(10) },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.contributions).toEqual([]);
    }
  });

  it("rejects an envelope that isn't active next month (R31)", () => {
    const result = closeMonth(
      baseInput({
        allocations: [
          { destination: "envelope", envelopeId: "unknown", amount: moneyFromEuros(20) },
        ],
      }),
    );
    expect(result).toEqual({ ok: false, error: { type: "envelopeNotActiveNextMonth" } });
  });

  it("rejects an envelope split once next month is already open (R33)", () => {
    const result = closeMonth(
      baseInput({
        nextMonthIsOpen: true,
        allocations: [{ destination: "envelope", envelopeId: "e1", amount: moneyFromEuros(20) }],
      }),
    );
    expect(result).toEqual({ ok: false, error: { type: "nextMonthAlreadyOpen" } });
  });

  it("rejects a report split once next month is already open (R33)", () => {
    const result = closeMonth(
      baseInput({
        nextMonthIsOpen: true,
        allocations: [{ destination: "report", amount: moneyFromEuros(20) }],
      }),
    );
    expect(result).toEqual({ ok: false, error: { type: "nextMonthAlreadyOpen" } });
  });

  it("still accepts a savings/provision split once next month is already open (R33)", () => {
    const result = closeMonth(
      baseInput({
        nextMonthIsOpen: true,
        allocations: [{ destination: "savings", amount: moneyFromEuros(20) }],
      }),
    );
    expect(result.ok).toBe(true);
  });
});

describe("computeCarriedOver (R32)", () => {
  it("sums the report-destination allocations, ignoring the rest", () => {
    const result = computeCarriedOver([
      { id: "a1", destination: "report", amount: moneyFromEuros(20) },
      { id: "a2", destination: "report", amount: moneyFromEuros(5) },
      { id: "a3", destination: "savings", amount: moneyFromEuros(100) },
    ]);
    expect(moneyToCents(result)).toBe(moneyToCents(moneyFromEuros(25)));
  });

  it("is 0 when nothing was reported", () => {
    expect(moneyToCents(computeCarriedOver([]))).toBe(0);
  });
});

describe("computeEnvelopeBonus (R31)", () => {
  it("sums the envelope-destination allocations for that envelope only", () => {
    const result = computeEnvelopeBonus(
      [
        { id: "a1", destination: "envelope", envelopeId: "e1", amount: moneyFromEuros(20) },
        { id: "a2", destination: "envelope", envelopeId: "e2", amount: moneyFromEuros(100) },
        { id: "a3", destination: "report", amount: moneyFromEuros(5) },
      ],
      "e1",
    );
    expect(moneyToCents(result)).toBe(moneyToCents(moneyFromEuros(20)));
  });

  it("is 0 when this envelope received nothing", () => {
    expect(moneyToCents(computeEnvelopeBonus([], "e1"))).toBe(0);
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
