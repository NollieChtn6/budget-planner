import type { Category } from "../budget/category";
import { type CalendarDate, monthOfCalendarDate } from "../calendar-date";
import { type Money, moneyToCents } from "../money";
import { isSameMonth, type Month } from "../month";

/**
 * V1 scope: an expense can only be imputed to a variable envelope. Provision
 * expenses (R22/R23) are a later iteration (see issue #11's follow-ups).
 */
export type ExpenseSource = { type: "envelope"; envelopeId: string };

export type Expense = {
  id: string;
  date: CalendarDate;
  amount: Money;
  place?: string;
  description?: string;
  categoryId: string;
  source: ExpenseSource;
};

export type RecordExpenseInput = {
  date: CalendarDate;
  amount: Money;
  place?: string;
  description?: string;
  categoryId: string;
  envelopeId: string;
};

/**
 * `snapshotEnvelopeIds` are the envelopes actually budgeted for this month
 * (its frozen instantané, docs/domain/model.md), not the live parameterization:
 * an envelope archived after the month opened is still a valid target.
 */
export type RecordExpenseContext = {
  currentMonth: Month;
  categories: Category[];
  snapshotEnvelopeIds: string[];
};

export type RecordExpenseFailure =
  | { type: "invalidAmount" }
  | { type: "dateOutsideCurrentMonth" }
  | { type: "unknownCategory" }
  | { type: "archivedCategory" }
  | { type: "envelopeNotInSnapshot" };

export type RecordExpenseResult =
  | { ok: true; expense: Omit<Expense, "id"> }
  | { ok: false; error: RecordExpenseFailure };

/** R3: a expense is attached to the budget month of its date. */
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

  if (!context.snapshotEnvelopeIds.includes(input.envelopeId)) {
    return { ok: false, error: { type: "envelopeNotInSnapshot" } };
  }

  return {
    ok: true,
    expense: {
      date: input.date,
      amount: input.amount,
      place: input.place,
      description: input.description,
      categoryId: input.categoryId,
      source: { type: "envelope", envelopeId: input.envelopeId },
    },
  };
}
