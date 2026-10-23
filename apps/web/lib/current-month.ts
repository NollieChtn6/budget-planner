import { findMostRecentClosedBudgetMonthByUser, findOpenBudgetMonthByUser } from "@budget/db";
import { type Month, nextMonth, parseMonth } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";

/** The real calendar month, read from the system clock (never from client input). */
export function resolveCurrentMonth(): Month {
  const now = new Date();
  const year = now.getFullYear().toString().padStart(4, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return parseMonth(`${year}-${month}`);
}

/**
 * The active month (glossary.md's `activeMonth`): the oldest unclosed month —
 * the open month if one exists, else the month right after the last closed
 * one, else the real calendar month for a brand-new account. Independent
 * from the calendar month, which only signals that a closure is due
 * (SPEC.md's "Ce mois-ci").
 */
export async function resolveActiveMonth(prisma: PrismaClient, userId: string): Promise<Month> {
  const open = await findOpenBudgetMonthByUser(prisma, userId);
  if (open) {
    return open.month;
  }

  const mostRecentlyClosed = await findMostRecentClosedBudgetMonthByUser(prisma, userId);
  if (mostRecentlyClosed) {
    return nextMonth(mostRecentlyClosed.month);
  }

  return resolveCurrentMonth();
}
