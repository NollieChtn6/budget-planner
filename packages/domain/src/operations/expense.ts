import type { Category } from "../budget/category";
import { type CalendarDate, monthOfCalendarDate } from "../calendar-date";
import { type Money, moneyFromCents, moneyToCents } from "../money";
import { isSameMonth, type Month } from "../month";

export type ExpenseSource =
  | { type: "envelope"; envelopeId: string }
  | { type: "provision"; provisionId: string };

export type Expense = {
  id: string;
  date: CalendarDate;
  amount: Money;
  place?: string;
  description?: string;
  categoryId: string;
  source: ExpenseSource;
  /** R22: part of the amount financed by savings. Only ever set for a provision source. */
  savingsDraw?: Money;
};

export type RecordExpenseInput = {
  date: CalendarDate;
  amount: Money;
  place?: string;
  description?: string;
  categoryId: string;
  target: ExpenseSource;
};

/**
 * `snapshotEnvelopeIds`/`snapshotProvisionIds` are what's actually budgeted
 * for this month (its frozen instantané, docs/domain/model.md), not the live
 * parameterization: an envelope or provision archived after the month opened
 * is still a valid target. `provisionBalance` (R22) isn't computed here —
 * like `computeMonthlyTarget`'s `balance` parameter, it's supplied by the
 * caller from that provision's full contribution/expense history — and is
 * only read when `target.type` is `"provision"`.
 */
export type RecordExpenseContext = {
  currentMonth: Month;
  categories: Category[];
  snapshotEnvelopeIds: string[];
  snapshotProvisionIds: string[];
  provisionBalance?: Money;
};

export type RecordExpenseFailure =
  | { type: "invalidAmount" }
  | { type: "dateOutsideCurrentMonth" }
  | { type: "unknownCategory" }
  | { type: "archivedCategory" }
  | { type: "envelopeNotInSnapshot" }
  | { type: "provisionNotInSnapshot" };

export type RecordExpenseResult =
  | { ok: true; expense: Omit<Expense, "id"> }
  | { ok: false; error: RecordExpenseFailure };

/**
 * R3: an expense is attached to the budget month of its date. R22: on a
 * provision, an amount beyond its balance draws from savings, and the
 * provision's own balance never drops below 0 as a result.
 */
export function recordExpense(
  input: RecordExpenseInput,
  context: RecordExpenseContext,
): RecordExpenseResult {
  if (moneyToCents(input.amount) <= 0) {
    return { ok: false, error: { type: "invalidAmount" } };
  }

  if (!isSameMonth(monthOfCalendarDate(input.date), context.currentMonth)) {
    return { ok: false, error: { type: "dateOutsideCurrentMonth" } };
  }

  const category = context.categories.find((c) => c.id === input.categoryId);
  if (!category) {
    return { ok: false, error: { type: "unknownCategory" } };
  }
  if (category.archived) {
    return { ok: false, error: { type: "archivedCategory" } };
  }

  const base = {
    date: input.date,
    amount: input.amount,
    place: input.place,
    description: input.description,
    categoryId: input.categoryId,
  };

  if (input.target.type === "envelope") {
    if (!context.snapshotEnvelopeIds.includes(input.target.envelopeId)) {
      return { ok: false, error: { type: "envelopeNotInSnapshot" } };
    }
    return {
      ok: true,
      expense: { ...base, source: { type: "envelope", envelopeId: input.target.envelopeId } },
    };
  }

  if (!context.snapshotProvisionIds.includes(input.target.provisionId)) {
    return { ok: false, error: { type: "provisionNotInSnapshot" } };
  }
  const balance = context.provisionBalance ?? moneyFromCents(0);
  const drawCents = Math.max(0, moneyToCents(input.amount) - moneyToCents(balance));
  return {
    ok: true,
    expense: {
      ...base,
      source: { type: "provision", provisionId: input.target.provisionId },
      ...(drawCents > 0 ? { savingsDraw: moneyFromCents(drawCents) } : {}),
    },
  };
}
