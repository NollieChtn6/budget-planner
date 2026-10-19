import { moneyFromCents, moneyToCents, type SavingsTransfer } from "@budget/domain";
import type { SavingsTransfer as PrismaSavingsTransfer } from "@prisma/client";
import { calendarDateToDate, dateToCalendarDate } from "./calendar-date";

export function toDomainSavingsTransfer(row: PrismaSavingsTransfer): SavingsTransfer {
  return {
    id: row.id,
    date: dateToCalendarDate(row.date),
    amount: moneyFromCents(row.amountCents),
    ...(row.label ? { label: row.label } : {}),
  };
}

export function toPrismaSavingsTransferData(savingsTransfer: Omit<SavingsTransfer, "id">): {
  date: Date;
  amountCents: number;
  label: string | null;
} {
  return {
    date: calendarDateToDate(savingsTransfer.date),
    amountCents: moneyToCents(savingsTransfer.amount),
    label: savingsTransfer.label ?? null,
  };
}
