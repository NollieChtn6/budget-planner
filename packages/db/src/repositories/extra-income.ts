import { type ExtraIncome, firstDayOfMonth, lastDayOfMonth, type Month } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { calendarDateToDate } from "../mappers/calendar-date";
import { toDomainExtraIncome, toPrismaExtraIncomeData } from "../mappers/extra-income";

export async function findExtraIncomesByUserAndMonth(
  prisma: PrismaClient,
  userId: string,
  month: Month,
): Promise<ExtraIncome[]> {
  const rows = await prisma.extraIncome.findMany({
    where: {
      userId,
      date: {
        gte: calendarDateToDate(firstDayOfMonth(month)),
        lte: calendarDateToDate(lastDayOfMonth(month)),
      },
    },
    orderBy: { date: "asc" },
  });
  return rows.map(toDomainExtraIncome);
}

export async function findExtraIncomeById(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<ExtraIncome | null> {
  const row = await prisma.extraIncome.findFirst({ where: { id, userId } });
  return row ? toDomainExtraIncome(row) : null;
}

export async function createExtraIncome(
  prisma: PrismaClient,
  userId: string,
  extraIncome: Omit<ExtraIncome, "id">,
): Promise<ExtraIncome> {
  const row = await prisma.extraIncome.create({
    data: { userId, ...toPrismaExtraIncomeData(extraIncome) },
  });
  return toDomainExtraIncome(row);
}

export async function updateExtraIncome(
  prisma: PrismaClient,
  userId: string,
  id: string,
  extraIncome: Omit<ExtraIncome, "id">,
): Promise<void> {
  const updated = await prisma.extraIncome.updateMany({
    where: { id, userId },
    data: toPrismaExtraIncomeData(extraIncome),
  });
  if (updated.count === 0) {
    throw new Error("Extra income not found for this user");
  }
}

export async function deleteExtraIncome(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<void> {
  const deleted = await prisma.extraIncome.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) {
    throw new Error("Extra income not found for this user");
  }
}
