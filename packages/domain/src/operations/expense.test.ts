import { describe, expect, it } from "vitest";
import type { Category } from "../budget/category";
import { parseCalendarDate } from "../calendar-date";
import { moneyFromEuros, moneyToCents, moneyToEuros } from "../money";
import { parseMonth } from "../month";
import { type RecordExpenseContext, type RecordExpenseInput, recordExpense } from "./expense";

const currentMonth = parseMonth("2026-10");

const categories: Category[] = [
  { id: "c1", label: "Courses", defaultEnvelopeId: "e1", archived: false },
  { id: "c2", label: "Ancienne", archived: true },
];

const context: RecordExpenseContext = {
  currentMonth,
  categories,
  snapshotEnvelopeIds: ["e1"],
  snapshotProvisionIds: ["p1"],
};

function baseInput(overrides: Partial<RecordExpenseInput> = {}): RecordExpenseInput {
  return {
    date: parseCalendarDate("2026-10-05"),
    amount: moneyFromEuros(15),
    categoryId: "c1",
    target: { type: "envelope", envelopeId: "e1" },
    ...overrides,
  };
}

describe("recordExpense — envelope target", () => {
  it("accepts a valid expense on a snapshot envelope", () => {
    const result = recordExpense(baseInput({ place: "Monoprix" }), context);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expense.source).toEqual({ type: "envelope", envelopeId: "e1" });
      expect(result.expense.place).toBe("Monoprix");
      expect(result.expense.savingsDraw).toBeUndefined();
    }
  });

  it("rejects an envelope that isn't part of this month's snapshot", () => {
    const result = recordExpense(
      baseInput({ target: { type: "envelope", envelopeId: "unknown" } }),
      context,
    );
    expect(result).toEqual({ ok: false, error: { type: "envelopeNotInSnapshot" } });
  });
});

describe("recordExpense — provision target (R22)", () => {
  it("draws nothing from savings when the amount stays within the balance", () => {
    const result = recordExpense(
      baseInput({
        amount: moneyFromEuros(100),
        target: { type: "provision", provisionId: "p1" },
      }),
      { ...context, provisionBalance: moneyFromEuros(250) },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.expense.source).toEqual({ type: "provision", provisionId: "p1" });
      expect(result.expense.savingsDraw).toBeUndefined();
    }
  });

  it("E10: a 300€ expense on a 250€ balance draws 50€ from savings", () => {
    const result = recordExpense(
      baseInput({
        amount: moneyFromEuros(300),
        target: { type: "provision", provisionId: "p1" },
      }),
      { ...context, provisionBalance: moneyFromEuros(250) },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(moneyToCents(result.expense.savingsDraw ?? moneyFromEuros(-1))).toBe(5000);
    }
  });

  it("draws the full amount from savings when the provision has no balance", () => {
    const result = recordExpense(
      baseInput({
        amount: moneyFromEuros(40),
        target: { type: "provision", provisionId: "p1" },
      }),
      context,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(moneyToEuros(result.expense.savingsDraw ?? moneyFromEuros(-1))).toBe(40);
    }
  });

  it("rejects a provision that isn't part of this month's snapshot", () => {
    const result = recordExpense(
      baseInput({ target: { type: "provision", provisionId: "unknown" } }),
      context,
    );
    expect(result).toEqual({ ok: false, error: { type: "provisionNotInSnapshot" } });
  });
});

describe("recordExpense — shared validation", () => {
  it("rejects a zero amount", () => {
    const result = recordExpense(baseInput({ amount: moneyFromEuros(0) }), context);
    expect(result).toEqual({ ok: false, error: { type: "invalidAmount" } });
  });

  it("rejects a negative amount", () => {
    const result = recordExpense(baseInput({ amount: moneyFromEuros(-5) }), context);
    expect(result).toEqual({ ok: false, error: { type: "invalidAmount" } });
  });

  it("rejects a date outside the current month (R3)", () => {
    const result = recordExpense(baseInput({ date: parseCalendarDate("2026-11-01") }), context);
    expect(result).toEqual({ ok: false, error: { type: "dateOutsideCurrentMonth" } });
  });

  it("rejects an unknown category", () => {
    const result = recordExpense(baseInput({ categoryId: "unknown" }), context);
    expect(result).toEqual({ ok: false, error: { type: "unknownCategory" } });
  });

  it("rejects an archived category", () => {
    const result = recordExpense(baseInput({ categoryId: "c2" }), context);
    expect(result).toEqual({ ok: false, error: { type: "archivedCategory" } });
  });
});
