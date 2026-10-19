import { describe, expect, it } from "vitest";
import type { Category } from "../budget/category";
import { parseCalendarDate } from "../calendar-date";
import { moneyFromEuros } from "../money";
import { parseMonth } from "../month";
import {
  exceedsExpenseAmount,
  type RecordReimbursementContext,
  type RecordReimbursementInput,
  recordReimbursement,
} from "./reimbursement";

const categories: Category[] = [
  { id: "health", label: "Santé", color: "#336699", archived: false },
  { id: "old", label: "Ancienne", color: "#996633", archived: true },
];

const context: RecordReimbursementContext = {
  currentMonth: parseMonth("2026-10"),
  categories,
};

function baseInput(overrides: Partial<RecordReimbursementInput> = {}): RecordReimbursementInput {
  return {
    date: parseCalendarDate("2026-10-12"),
    amount: moneyFromEuros(42),
    label: "Mutuelle",
    categoryId: "health",
    ...overrides,
  };
}

describe("recordReimbursement", () => {
  it("accepts a reimbursement received in the current month (E17)", () => {
    const result = recordReimbursement(baseInput(), context);
    expect(result).toEqual({
      ok: true,
      reimbursement: {
        date: parseCalendarDate("2026-10-12"),
        amount: moneyFromEuros(42),
        label: "Mutuelle",
        categoryId: "health",
      },
    });
  });

  it("keeps the optional link to the reimbursed expense", () => {
    const result = recordReimbursement(baseInput({ expenseId: "e1" }), context);
    expect(result.ok && result.reimbursement.expenseId).toBe("e1");
  });

  it("trims the label", () => {
    const result = recordReimbursement(baseInput({ label: "  Sécu " }), context);
    expect(result.ok && result.reimbursement.label).toBe("Sécu");
  });

  it("rejects a zero amount", () => {
    const result = recordReimbursement(baseInput({ amount: moneyFromEuros(0) }), context);
    expect(result).toEqual({ ok: false, error: { type: "invalidAmount" } });
  });

  it("rejects a blank label", () => {
    const result = recordReimbursement(baseInput({ label: "   " }), context);
    expect(result).toEqual({ ok: false, error: { type: "emptyLabel" } });
  });

  it("rejects a date of receipt outside the current month, even if the expense was paid then (R3, R35)", () => {
    const result = recordReimbursement(
      baseInput({ date: parseCalendarDate("2026-09-30") }),
      context,
    );
    expect(result).toEqual({ ok: false, error: { type: "dateOutsideCurrentMonth" } });
  });

  it("rejects an unknown category", () => {
    const result = recordReimbursement(baseInput({ categoryId: "nope" }), context);
    expect(result).toEqual({ ok: false, error: { type: "unknownCategory" } });
  });

  it("rejects an archived category", () => {
    const result = recordReimbursement(baseInput({ categoryId: "old" }), context);
    expect(result).toEqual({ ok: false, error: { type: "archivedCategory" } });
  });
});

describe("exceedsExpenseAmount", () => {
  it("is false when the reimbursements stay within the expense", () => {
    expect(exceedsExpenseAmount(moneyFromEuros(60), [moneyFromEuros(42)])).toBe(false);
  });

  it("is false when the expense is fully reimbursed", () => {
    expect(exceedsExpenseAmount(moneyFromEuros(60), [moneyFromEuros(40), moneyFromEuros(20)])).toBe(
      false,
    );
  });

  it("is true when several reimbursements add up beyond the expense (R35)", () => {
    expect(exceedsExpenseAmount(moneyFromEuros(60), [moneyFromEuros(40), moneyFromEuros(40)])).toBe(
      true,
    );
  });
});
