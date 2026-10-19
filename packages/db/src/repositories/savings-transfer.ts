import { firstDayOfMonth, lastDayOfMonth, type Month, type SavingsTransfer } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { calendarDateToDate } from "../mappers/calendar-date";
import { toDomainSavingsTransfer, toPrismaSavingsTransferData } from "../mappers/savings-transfer";

export async function findSavingsTransfersByUserAndMonth(
  prisma: PrismaClient,
  userId: string,
  month: Month,
): Promise<SavingsTransfer[]> {
  const rows = await prisma.savingsTransfer.findMany({
    where: {
      userId,
      date: {
        gte: calendarDateToDate(firstDayOfMonth(month)),
        lte: calendarDateToDate(lastDayOfMonth(month)),
      },
    },
    orderBy: { date: "asc" },
  });
  return rows.map(toDomainSavingsTransfer);
}

export async function findSavingsTransferById(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<SavingsTransfer | null> {
  const row = await prisma.savingsTransfer.findFirst({ where: { id, userId } });
  return row ? toDomainSavingsTransfer(row) : null;
}

export async function createSavingsTransfer(
  prisma: PrismaClient,
  userId: string,
  savingsTransfer: Omit<SavingsTransfer, "id">,
): Promise<SavingsTransfer> {
  const row = await prisma.savingsTransfer.create({
    data: { userId, ...toPrismaSavingsTransferData(savingsTransfer) },
  });
  return toDomainSavingsTransfer(row);
}

export async function updateSavingsTransfer(
  prisma: PrismaClient,
  userId: string,
  id: string,
  savingsTransfer: Omit<SavingsTransfer, "id">,
): Promise<void> {
  const updated = await prisma.savingsTransfer.updateMany({
    where: { id, userId },
    data: toPrismaSavingsTransferData(savingsTransfer),
  });
  if (updated.count === 0) {
    throw new Error("Savings transfer not found for this user");
  }
}

export async function deleteSavingsTransfer(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<void> {
  const deleted = await prisma.savingsTransfer.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) {
    throw new Error("Savings transfer not found for this user");
  }
}
