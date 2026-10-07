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

/** All-time, used to compute a provision's balance (docs/domain/model.md), which isn't scoped to a month. */
export async function findExpensesByUserAndProvision(
  prisma: PrismaClient,
  userId: string,
  provisionId: string,
): Promise<Expense[]> {
  const rows = await prisma.expense.findMany({
    where: { userId, provisionId },
    orderBy: { date: "asc" },
  });
  return rows.map(toDomainExpense);
}

export async function findExpenseById(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<Expense | null> {
  const row = await prisma.expense.findFirst({ where: { id, userId } });
  return row ? toDomainExpense(row) : null;
}

/**
 * The target's ownership (envelope or provision) and the category's are
 * checked explicitly here, like `addVariableEnvelopeVersion` does for its
 * own foreign row: Prisma's `create` has no WHERE clause to scope it by
 * userId (ADR-0011).
 */
export async function createExpense(
  prisma: PrismaClient,
  userId: string,
  expense: Omit<Expense, "id">,
): Promise<Expense> {
  const targetCheck =
    expense.source.type === "envelope"
      ? prisma.variableEnvelope.findFirst({
          where: { id: expense.source.envelopeId, userId },
          select: { id: true },
        })
      : prisma.provision.findFirst({
          where: { id: expense.source.provisionId, userId },
          select: { id: true },
        });

  const [target, category] = await Promise.all([
    targetCheck,
    prisma.category.findFirst({ where: { id: expense.categoryId, userId }, select: { id: true } }),
  ]);
  if (!target) {
    const targetId =
      expense.source.type === "envelope" ? expense.source.envelopeId : expense.source.provisionId;
    throw new Error(`${expense.source.type} ${targetId} not found for this user`);
  }
  if (!category) {
    throw new Error(`Category ${expense.categoryId} not found for this user`);
  }

  const row = await prisma.expense.create({ data: { userId, ...toPrismaExpenseData(expense) } });
  return toDomainExpense(row);
}

/** Ownership and ordinality mirror `createExpense`'s ADR-0011 checks. */
export async function updateExpense(
  prisma: PrismaClient,
  userId: string,
  id: string,
  expense: Omit<Expense, "id">,
): Promise<void> {
  const targetCheck =
    expense.source.type === "envelope"
      ? prisma.variableEnvelope.findFirst({
          where: { id: expense.source.envelopeId, userId },
          select: { id: true },
        })
      : prisma.provision.findFirst({
          where: { id: expense.source.provisionId, userId },
          select: { id: true },
        });

  const [target, category] = await Promise.all([
    targetCheck,
    prisma.category.findFirst({ where: { id: expense.categoryId, userId }, select: { id: true } }),
  ]);
  if (!target) {
    const targetId =
      expense.source.type === "envelope" ? expense.source.envelopeId : expense.source.provisionId;
    throw new Error(`${expense.source.type} ${targetId} not found for this user`);
  }
  if (!category) {
    throw new Error(`Category ${expense.categoryId} not found for this user`);
  }

  const updated = await prisma.expense.updateMany({
    where: { id, userId },
    data: toPrismaExpenseData(expense),
  });
  if (updated.count === 0) {
    throw new Error("Expense not found for this user");
  }
}

export async function deleteExpense(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<void> {
  const deleted = await prisma.expense.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) {
    throw new Error("Expense not found for this user");
  }
}
