import { type Expense, firstDayOfMonth, lastDayOfMonth, type Month } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { calendarDateToDate } from "../mappers/calendar-date";
import { toDomainExpense, toPrismaExpenseData } from "../mappers/expense";

export async function findExpensesByUserAndMonth(
  prisma: PrismaClient,
  userId: string,
  month: Month,
): Promise<Expense[]> {
  const rows = await prisma.expense.findMany({
    where: {
      userId,
      date: {
        gte: calendarDateToDate(firstDayOfMonth(month)),
        lte: calendarDateToDate(lastDayOfMonth(month)),
      },
    },
    orderBy: { date: "asc" },
  });
  return rows.map(toDomainExpense);
}

/**
 * `envelopeId`/`categoryId` ownership is checked explicitly here, like
 * `addVariableEnvelopeVersion` does for its own foreign row: Prisma's
 * `create` has no WHERE clause to scope it by userId (ADR-0011).
 */
export async function createExpense(
  prisma: PrismaClient,
  userId: string,
  expense: Omit<Expense, "id">,
): Promise<Expense> {
  const [envelope, category] = await Promise.all([
    prisma.variableEnvelope.findFirst({
      where: { id: expense.source.envelopeId, userId },
      select: { id: true },
    }),
    prisma.category.findFirst({ where: { id: expense.categoryId, userId }, select: { id: true } }),
  ]);
  if (!envelope) {
    throw new Error(`Variable envelope ${expense.source.envelopeId} not found for this user`);
  }
  if (!category) {
    throw new Error(`Category ${expense.categoryId} not found for this user`);
  }

  const row = await prisma.expense.create({ data: { userId, ...toPrismaExpenseData(expense) } });
  return toDomainExpense(row);
}
