import { type Expense, moneyFromCents, moneyToCents } from "@budget/domain";
import type { Expense as PrismaExpense } from "@prisma/client";
import { calendarDateToDate, dateToCalendarDate } from "./calendar-date";

export function toDomainExpense(row: PrismaExpense): Expense {
  return {
    id: row.id,
    date: dateToCalendarDate(row.date),
    amount: moneyFromCents(row.amountCents),
    categoryId: row.categoryId,
    source: { type: "envelope", envelopeId: row.envelopeId },
    ...(row.place ? { place: row.place } : {}),
    ...(row.description ? { description: row.description } : {}),
  };
}

export function toPrismaExpenseData(expense: Omit<Expense, "id">): {
  envelopeId: string;
  categoryId: string;
  date: Date;
  amountCents: number;
  place: string | null;
  description: string | null;
} {
  return {
    envelopeId: expense.source.envelopeId,
    categoryId: expense.categoryId,
    date: calendarDateToDate(expense.date),
    amountCents: moneyToCents(expense.amount),
    place: expense.place ?? null,
    description: expense.description ?? null,
  };
}
