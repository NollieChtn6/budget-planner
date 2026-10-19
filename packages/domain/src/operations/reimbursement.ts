import type { Category } from "../budget/category";
import { type CalendarDate, monthOfCalendarDate } from "../calendar-date";
import { type Money, moneyToCents, sumMoney } from "../money";
import { isSameMonth, type Month } from "../month";

export type Reimbursement = {
  id: string;
  date: CalendarDate;
  amount: Money;
  label: string;
  categoryId: string;
  /** Informative link to the reimbursed expense, possibly from a closed month; never read by any calculation (R35). */
  expenseId?: string;
};

export type RecordReimbursementInput = {
  date: CalendarDate;
  amount: Money;
  label: string;
  categoryId: string;
  expenseId?: string;
};

export type RecordReimbursementContext = {
  currentMonth: Month;
  categories: Category[];
};

export type RecordReimbursementFailure =
  | { type: "invalidAmount" }
  | { type: "emptyLabel" }
  | { type: "dateOutsideCurrentMonth" }
  | { type: "unknownCategory" }
  | { type: "archivedCategory" };

export type RecordReimbursementResult =
  | { ok: true; reimbursement: Omit<Reimbursement, "id"> }
  | { ok: false; error: RecordReimbursementFailure };

/**
 * R35, R3: a reimbursement is attached to the budget month of its date of
 * receipt, not to the month of the expense it reimburses. Whether
 * `expenseId` exists and belongs to the user is checked by the caller.
 */
export function recordReimbursement(
  input: RecordReimbursementInput,
  context: RecordReimbursementContext,
): RecordReimbursementResult {
  if (moneyToCents(input.amount) <= 0) {
    return { ok: false, error: { type: "invalidAmount" } };
  }

  const label = input.label.trim();
  if (label === "") {
    return { ok: false, error: { type: "emptyLabel" } };
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

  return {
    ok: true,
    reimbursement: {
      date: input.date,
      amount: input.amount,
      label,
      categoryId: input.categoryId,
      ...(input.expenseId ? { expenseId: input.expenseId } : {}),
    },
  };
}

/** R35: the warning (never a blocker) shown when the reimbursements linked to an expense exceed its amount. */
export function exceedsExpenseAmount(expenseAmount: Money, reimbursementAmounts: Money[]): boolean {
  return moneyToCents(sumMoney(reimbursementAmounts)) > moneyToCents(expenseAmount);
}
