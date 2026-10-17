import { type Contribution, firstDayOfMonth, lastDayOfMonth, type Month } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { calendarDateToDate } from "../mappers/calendar-date";
import { toDomainContribution, toPrismaContributionData } from "../mappers/contribution";

export async function findContributionsByUserAndMonth(
  prisma: PrismaClient,
  userId: string,
  month: Month,
): Promise<Contribution[]> {
  const rows = await prisma.contribution.findMany({
    where: {
      userId,
      date: {
        gte: calendarDateToDate(firstDayOfMonth(month)),
        lte: calendarDateToDate(lastDayOfMonth(month)),
      },
    },
    orderBy: { date: "asc" },
  });
  return rows.map(toDomainContribution);
}

/** All-time, used to compute a provision's balance (docs/domain/model.md), which isn't scoped to a month. */
export async function findContributionsByUserAndProvision(
  prisma: PrismaClient,
  userId: string,
  provisionId: string,
): Promise<Contribution[]> {
  const rows = await prisma.contribution.findMany({
    where: { userId, provisionId },
    orderBy: { date: "asc" },
  });
  return rows.map(toDomainContribution);
}

export async function findContributionById(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<Contribution | null> {
  const row = await prisma.contribution.findFirst({ where: { id, userId } });
  return row ? toDomainContribution(row) : null;
}

/**
 * `provisionId` ownership is checked explicitly here, like
 * `addVariableEnvelopeVersion` does for its own foreign row: Prisma's
 * `create` has no WHERE clause to scope it by userId (ADR-0011).
 */
export async function createContribution(
  prisma: PrismaClient,
  userId: string,
  contribution: Omit<Contribution, "id">,
): Promise<Contribution> {
  const provision = await prisma.provision.findFirst({
    where: { id: contribution.provisionId, userId },
    select: { id: true },
  });
  if (!provision) {
    throw new Error(`Provision ${contribution.provisionId} not found for this user`);
  }

  const row = await prisma.contribution.create({
    data: { userId, ...toPrismaContributionData(contribution) },
  });
  return toDomainContribution(row);
}

export async function updateContribution(
  prisma: PrismaClient,
  userId: string,
  id: string,
  contribution: Omit<Contribution, "id">,
): Promise<void> {
  const provision = await prisma.provision.findFirst({
    where: { id: contribution.provisionId, userId },
    select: { id: true },
  });
  if (!provision) {
    throw new Error(`Provision ${contribution.provisionId} not found for this user`);
  }

  const updated = await prisma.contribution.updateMany({
    where: { id, userId },
    data: toPrismaContributionData(contribution),
  });
  if (updated.count === 0) {
    throw new Error("Contribution not found for this user");
  }
}

export async function deleteContribution(
  prisma: PrismaClient,
  userId: string,
  id: string,
): Promise<void> {
  const deleted = await prisma.contribution.deleteMany({ where: { id, userId } });
  if (deleted.count === 0) {
    throw new Error("Contribution not found for this user");
  }
}
