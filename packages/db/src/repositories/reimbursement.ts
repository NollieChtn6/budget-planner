import { firstDayOfMonth, lastDayOfMonth, type Month, type Reimbursement } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { calendarDateToDate } from "../mappers/calendar-date";
import { toDomainReimbursement, toPrismaReimbursementData } from "../mappers/reimbursement";

export async function findReimbursementsByUserAndMonth(
  prisma: PrismaClient,
  userId: string,
  month: Month,
): Promise<Reimbursement[]> {
  const rows = await prisma.reimbursement.findMany({
    where: {
      userId,
      date: {
        gte: calendarDateToDate(firstDayOfMonth(month)),
        lte: calendarDateToDate(lastDayOfMonth(month)),
      },
    },
    orderBy: { date: "asc" },
  });
  return rows.map(toDomainReimbursement);
}

/**
 * R39: what the statistics page needs to net spending: the reimbursements
 * linked to the given expenses (whenever received) plus the unlinked ones
 * received from the first day of `from` to the last day of `to`.
 */
export async function findReimbursementsForStats(
  prisma: PrismaClient,
  userId: string,
  from: Month,
  to: Month,
  expenseIds: string[],
): Promise<Reimbursement[]> {
  const rows = await prisma.reimbursement.findMany({
    where: {
      userId,
      OR: [
        { expenseId: { in: expenseIds } },
        {
          expenseId: null,
          date: {
            gte: calendarDateToDate(firstDayOfMonth(from)),
            lte: calendarDateToDate(lastDayOfMonth(to)),
          },
        },
      ],
    },
    orderBy: { date: "asc" },
  });
  return rows.map(toDomainReimbursement);
}

/** All-time, used for the R35 warning when the reimbursements of an expense exceed it. */
export async function findReimbursementsByUserAndExpense(
  prisma: PrismaClient,
  userId: string,
  expenseId: string,
): Promise<Reimbursement[]> {
  const rows = await prisma.reimbursement.findMany({
    where: { userId, expenseId },
    orderBy: { date: "asc" },
  });
  return rows.map(toDomainReimbursement);
}

export async function findReimbursementById(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<Reimbursement | null> {
  const row = await prisma.reimbursement.findFirst({ where: { id, userId } });
  return row ? toDomainReimbursement(row) : null;
}

/**
 * The category's and the linked expense's ownership are checked explicitly
 * here, like `createExpense` does for its own foreign rows: Prisma's `create`
 * has no WHERE clause to scope it by userId (ADR-0011).
 */
async function assertForeignRowsOwned(
  prisma: PrismaClient,
  userId: string,
  reimbursement: Omit<Reimbursement, "id">,
): Promise<void> {
  const [category, expense] = await Promise.all([
    prisma.category.findFirst({
      where: { id: reimbursement.categoryId, userId },
      select: { id: true },
    }),
    reimbursement.expenseId
      ? prisma.expense.findFirst({
          where: { id: reimbursement.expenseId, userId },
          select: { id: true },
        })
      : Promise.resolve(true),
  ]);
  if (!category) {
    throw new Error(`Category ${reimbursement.categoryId} not found for this user`);
  }
  if (!expense) {
    throw new Error(`Expense ${reimbursement.expenseId} not found for this user`);
  }
}

export async function createReimbursement(
  prisma: PrismaClient,
  userId: string,
  reimbursement: Omit<Reimbursement, "id">,
): Promise<Reimbursement> {
  await assertForeignRowsOwned(prisma, userId, reimbursement);
  const row = await prisma.reimbursement.create({
    data: { userId, ...toPrismaReimbursementData(reimbursement) },
  });
  return toDomainReimbursement(row);
}

export async function updateReimbursement(
  prisma: PrismaClient,
  userId: string,
  id: string,
  reimbursement: Omit<Reimbursement, "id">,
): Promise<void> {
  await assertForeignRowsOwned(prisma, userId, reimbursement);
  const updated = await prisma.reimbursement.updateMany({
    where: { id, userId },
    data: toPrismaReimbursementData(reimbursement),
  });
  if (updated.count === 0) {
    throw new Error("Reimbursement not found for this user");
  }
}

export async function deleteReimbursement(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<void> {
  const deleted = await prisma.reimbursement.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) {
    throw new Error("Reimbursement not found for this user");
  }
}
