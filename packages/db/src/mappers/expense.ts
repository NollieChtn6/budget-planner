import { type Expense, moneyFromCents, moneyToCents } from "@budget/domain";
import type { Expense as PrismaExpense } from "@prisma/client";
import { calendarDateToDate, dateToCalendarDate } from "./calendar-date";

export function toDomainExpense(row: PrismaExpense): Expense {
  // The envelope_id/provision_id pairing is enforced by a DB CHECK constraint (see the migration).
  const source: Expense["source"] =
    row.envelopeId !== null
      ? { type: "envelope", envelopeId: row.envelopeId }
      : { type: "provision", provisionId: row.provisionId as string };

  return {
    id: row.id,
    date: dateToCalendarDate(row.date),
    amount: moneyFromCents(row.amountCents),
    categoryId: row.categoryId,
    source,
    ...(row.place ? { place: row.place } : {}),
    ...(row.description ? { description: row.description } : {}),
    ...(row.savingsDrawCents > 0 ? { savingsDraw: moneyFromCents(row.savingsDrawCents) } : {}),
  };
}

export function toPrismaExpenseData(expense: Omit<Expense, "id">): {
  envelopeId: string | null;
  provisionId: string | null;
  categoryId: string;
  date: Date;
  amountCents: number;
  savingsDrawCents: number;
  place: string | null;
  description: string | null;
} {
  return {
    envelopeId: expense.source.type === "envelope" ? expense.source.envelopeId : null,
    provisionId: expense.source.type === "provision" ? expense.source.provisionId : null,
    categoryId: expense.categoryId,
    date: calendarDateToDate(expense.date),
    amountCents: moneyToCents(expense.amount),
    savingsDrawCents: expense.savingsDraw ? moneyToCents(expense.savingsDraw) : 0,
    place: expense.place ?? null,
    description: expense.description ?? null,
  };
}
