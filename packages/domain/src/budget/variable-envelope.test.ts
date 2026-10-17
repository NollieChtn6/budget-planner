import { describe, expect, it } from "vitest";
import { moneyFromEuros } from "../money";
import { type Month, nextMonth, parseMonth, previousMonth } from "../month";
import {
  activeVersionAt,
  addVersion,
  archive,
  unarchive,
  type VariableEnvelope,
  type VariableEnvelopeVersion,
} from "./variable-envelope";

function envelope(
  id: string,
  label: string,
  versions: VariableEnvelopeVersion[],
  archivedFrom?: Month,
): VariableEnvelope {
  return archivedFrom ? { id, label, versions, archivedFrom } : { id, label, versions };
}

function amountVersion(envelopeId: string, month: string, euros: number): VariableEnvelopeVersion {
  return {
    envelopeId,
    effectiveFrom: parseMonth(month),
    mode: "amount",
    value: moneyFromEuros(euros),
  };
}

function percentageVersion(
  envelopeId: string,
  month: string,
  percentage: number,
): VariableEnvelopeVersion {
  return { envelopeId, effectiveFrom: parseMonth(month), mode: "percentage", value: percentage };
}

describe("activeVersionAt", () => {
  it("returns undefined before the first version", () => {
    const e = envelope("a", "A", [amountVersion("a", "2026-03", 100)]);
    expect(activeVersionAt(e, parseMonth("2026-02"))).toBeUndefined();
  });

  it("picks the latest version whose effectiveFrom is at or before the month", () => {
    const v1 = amountVersion("a", "2026-01", 100);
    const v2 = amountVersion("a", "2026-03", 150);
    const e = envelope("a", "A", [v1, v2]);
    expect(activeVersionAt(e, parseMonth("2026-02"))).toEqual(v1);
    expect(activeVersionAt(e, parseMonth("2026-03"))).toEqual(v2);
    expect(activeVersionAt(e, parseMonth("2026-05"))).toEqual(v2);
  });

  it("resolves normally before archivedFrom and returns undefined at/after it", () => {
    const v1 = amountVersion("a", "2026-01", 100);
    const e = envelope("a", "A", [v1], parseMonth("2026-04"));
    expect(activeVersionAt(e, parseMonth("2026-03"))).toEqual(v1);
    expect(activeVersionAt(e, parseMonth("2026-04"))).toBeUndefined();
    expect(activeVersionAt(e, parseMonth("2026-05"))).toBeUndefined();
  });
});

describe("addVersion — R7 (effective date)", () => {
  const currentMonth = parseMonth("2026-03");
  const target = envelope("a", "A", []);

  it("accepts the current month", () => {
    const result = addVersion(
      "a",
      [target],
      { effectiveFrom: currentMonth, mode: "amount", value: moneyFromEuros(150) },
      currentMonth,
    );
    expect(result.ok).toBe(true);
  });

  it("accepts the next month", () => {
    const result = addVersion(
      "a",
      [target],
      { effectiveFrom: nextMonth(currentMonth), mode: "amount", value: moneyFromEuros(150) },
      currentMonth,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects the previous month", () => {
    const result = addVersion(
      "a",
      [target],
      { effectiveFrom: previousMonth(currentMonth), mode: "amount", value: moneyFromEuros(150) },
      currentMonth,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.type).toBe("invalidEffectiveDate");
  });

  it("rejects a month further than the next one", () => {
    const result = addVersion(
      "a",
      [target],
      {
        effectiveFrom: nextMonth(nextMonth(currentMonth)),
        mode: "amount",
        value: moneyFromEuros(150),
      },
      currentMonth,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.type).toBe("invalidEffectiveDate");
  });
});

describe("addVersion — R12 (100% cap), single envelope", () => {
  const currentMonth = parseMonth("2026-01");

  it("accepts a percentage under 100 alone", () => {
    const target = envelope("a", "A", []);
    const result = addVersion(
      "a",
      [target],
      { effectiveFrom: currentMonth, mode: "percentage", value: 15 },
      currentMonth,
    );
    expect(result.ok).toBe(true);
  });

  it("does not count amount-mode envelopes toward the cap", () => {
    const target = envelope("a", "A", []);
    const other = envelope("b", "B", [amountVersion("b", "2026-01", 1000)]);
    const result = addVersion(
      "a",
      [target, other],
      { effectiveFrom: currentMonth, mode: "percentage", value: 90 },
      currentMonth,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a percentage over 100 alone", () => {
    const target = envelope("a", "A", []);
    const result = addVersion(
      "a",
      [target],
      { effectiveFrom: currentMonth, mode: "percentage", value: 150 },
      currentMonth,
    );
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.type === "percentageCapExceeded") {
      expect(result.error.violations).toEqual([{ month: currentMonth, total: 150 }]);
    } else {
      throw new Error("expected a percentageCapExceeded error");
    }
  });
});

describe("addVersion — R12 (100% cap), multiple envelopes and change points", () => {
  it("flags a violation at the effective-from month itself", () => {
    const currentMonth = parseMonth("2026-02");
    const a = envelope("a", "A", []);
    const b = envelope("b", "B", [percentageVersion("b", "2026-02", 50)]);
    const result = addVersion(
      "a",
      [a, b],
      { effectiveFrom: parseMonth("2026-02"), mode: "percentage", value: 60 },
      currentMonth,
    );
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.type === "percentageCapExceeded") {
      expect(result.error.violations).toEqual([{ month: parseMonth("2026-02"), total: 110 }]);
    } else {
      throw new Error("expected a percentageCapExceeded error");
    }
  });

  it("flags a violation only at a later change point, not at effective-from", () => {
    const currentMonth = parseMonth("2026-02");
    const a = envelope("a", "A", []);
    const b = envelope("b", "B", [
      percentageVersion("b", "2026-02", 50),
      percentageVersion("b", "2026-04", 70),
    ]);
    const result = addVersion(
      "a",
      [a, b],
      { effectiveFrom: parseMonth("2026-02"), mode: "percentage", value: 40 },
      currentMonth,
    );
    expect(result.ok).toBe(false);
    if (!result.ok && result.error.type === "percentageCapExceeded") {
      expect(result.error.violations).toEqual([{ month: parseMonth("2026-04"), total: 110 }]);
    } else {
      throw new Error("expected a percentageCapExceeded error");
    }
  });

  it("excludes change points beyond the candidate's own next version", () => {
    const currentMonth = parseMonth("2026-02");
    // Envelope A already has a later version at 2026-05, which bounds the check window.
    const a = envelope("a", "A", [percentageVersion("a", "2026-05", 10)]);
    // B's jump to 90% at 2026-06 would violate if counted, but it's outside [2026-02, 2026-05).
    const b = envelope("b", "B", [
      percentageVersion("b", "2026-01", 50),
      percentageVersion("b", "2026-06", 90),
    ]);
    const result = addVersion(
      "a",
      [a, b],
      { effectiveFrom: parseMonth("2026-02"), mode: "percentage", value: 40 },
      currentMonth,
    );
    expect(result.ok).toBe(true);
  });
});

describe("archive — R8", () => {
  const currentMonth = parseMonth("2026-03");
  const target = envelope("a", "A", [amountVersion("a", "2026-01", 100)]);

  it("allows the current month when there are no operations yet", () => {
    const result = archive(
      target,
      { effectiveFrom: currentMonth, hasOperationsInCurrentMonth: false },
      currentMonth,
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.envelope.archivedFrom).toEqual(currentMonth);
  });

  it("allows the next month regardless of operations", () => {
    const result = archive(
      target,
      { effectiveFrom: nextMonth(currentMonth), hasOperationsInCurrentMonth: true },
      currentMonth,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects the current month when operations already exist", () => {
    const result = archive(
      target,
      { effectiveFrom: currentMonth, hasOperationsInCurrentMonth: true },
      currentMonth,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.type).toBe("invalidArchiveDate");
  });
});

describe("unarchive — R8", () => {
  const currentMonth = parseMonth("2026-03");

  it("allows unarchiving before the archive date takes effect", () => {
    const archived = envelope("a", "A", [], nextMonth(currentMonth));
    const result = unarchive(archived, currentMonth);
    expect(result.ok).toBe(true);
    expect(result.ok && result.envelope.archivedFrom).toBeUndefined();
  });

  it("rejects when the archive date is the current month", () => {
    const archived = envelope("a", "A", [], currentMonth);
    const result = unarchive(archived, currentMonth);
    expect(result.ok).toBe(false);
  });

  it("rejects when the archive date is in the past", () => {
    const archived = envelope("a", "A", [], previousMonth(currentMonth));
    const result = unarchive(archived, currentMonth);
    expect(result.ok).toBe(false);
  });

  it("rejects when the envelope isn't archived", () => {
    const notArchived = envelope("a", "A", []);
    const result = unarchive(notArchived, currentMonth);
    expect(result.ok).toBe(false);
  });
});
