import { type Contribution, moneyFromCents, moneyToCents } from "@budget/domain";
import type { Contribution as PrismaContribution } from "@prisma/client";
import { calendarDateToDate, dateToCalendarDate } from "./calendar-date";

export function toDomainContribution(row: PrismaContribution): Contribution {
  return {
    id: row.id,
    date: dateToCalendarDate(row.date),
    amount: moneyFromCents(row.amountCents),
    provisionId: row.provisionId,
    origin: row.origin,
  };
}

export function toPrismaContributionData(contribution: Omit<Contribution, "id">): {
  provisionId: string;
  date: Date;
  amountCents: number;
  origin: Contribution["origin"];
} {
  return {
    provisionId: contribution.provisionId,
    date: calendarDateToDate(contribution.date),
    amountCents: moneyToCents(contribution.amount),
    origin: contribution.origin,
  };
}
