import { moneyFromCents, moneyToCents, type Reimbursement } from "@budget/domain";
import type { Reimbursement as PrismaReimbursement } from "@prisma/client";
import { calendarDateToDate, dateToCalendarDate } from "./calendar-date";

export function toDomainReimbursement(row: PrismaReimbursement): Reimbursement {
  return {
    id: row.id,
    date: dateToCalendarDate(row.date),
    amount: moneyFromCents(row.amountCents),
    label: row.label,
    categoryId: row.categoryId,
    ...(row.expenseId ? { expenseId: row.expenseId } : {}),
  };
}

export function toPrismaReimbursementData(reimbursement: Omit<Reimbursement, "id">): {
  categoryId: string;
  expenseId: string | null;
  date: Date;
  amountCents: number;
  label: string;
} {
  return {
    categoryId: reimbursement.categoryId,
    expenseId: reimbursement.expenseId ?? null,
    date: calendarDateToDate(reimbursement.date),
    amountCents: moneyToCents(reimbursement.amount),
    label: reimbursement.label,
  };
}
