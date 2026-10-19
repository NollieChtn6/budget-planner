import { type ExtraIncome, moneyFromCents, moneyToCents } from "@budget/domain";
import type { ExtraIncome as PrismaExtraIncome } from "@prisma/client";
import { calendarDateToDate, dateToCalendarDate } from "./calendar-date";

export function toDomainExtraIncome(row: PrismaExtraIncome): ExtraIncome {
  return {
    id: row.id,
    date: dateToCalendarDate(row.date),
    amount: moneyFromCents(row.amountCents),
    label: row.label,
  };
}

export function toPrismaExtraIncomeData(extraIncome: Omit<ExtraIncome, "id">): {
  date: Date;
  amountCents: number;
  label: string;
} {
  return {
    date: calendarDateToDate(extraIncome.date),
    amountCents: moneyToCents(extraIncome.amount),
    label: extraIncome.label,
  };
}
