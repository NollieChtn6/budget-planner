import { type CalendarDate, type Expense, moneyToEuros } from "@budget/domain";
import { formatEuros } from "@/lib/format-money";

export type ExpenseLinkOption = { id: string; categoryId: string; label: string };

function formatFullDate(date: CalendarDate): string {
  return `${date.day.toString().padStart(2, "0")}/${date.month.toString().padStart(2, "0")}/${date.year}`;
}

/** Candidates for a reimbursement's optional "Dépense d'origine" (R35): one readable line per expense. */
export function toExpenseLinkOptions(expenses: Expense[]): ExpenseLinkOption[] {
  return expenses.map((expense) => ({
    id: expense.id,
    categoryId: expense.categoryId,
    label: [
      formatFullDate(expense.date),
      expense.place ?? expense.description,
      formatEuros(moneyToEuros(expense.amount)),
    ]
      .filter(Boolean)
      .join(" · "),
  }));
}
