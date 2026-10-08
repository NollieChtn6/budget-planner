import type { BudgetMonth, Contribution, LeftoverAllocationInput, Month } from "@budget/domain";
import { moneyToCents } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { toPrismaContributionData } from "../mappers/contribution";
import { toPrismaLeftoverAllocationData } from "../mappers/leftover-allocation";
import {
  monthToDate,
  toDomainBudgetMonth,
  toPrismaSnapshotEnvelopeBudgetData,
  toPrismaSnapshotFixedEntryData,
  toPrismaSnapshotProvisionTargetData,
} from "../mappers/month";

const WITH_SNAPSHOT = {
  fixedEntries: true,
  envelopeBudgets: true,
  provisionTargets: true,
} as const;

export async function findBudgetMonthByMonth(
  prisma: PrismaClient,
  userId: string,
  month: Month,
): Promise<BudgetMonth | null> {
  const row = await prisma.budgetMonth.findFirst({
    where: { userId, month: monthToDate(month) },
    include: WITH_SNAPSHOT,
  });
  return row ? toDomainBudgetMonth(row) : null;
}

/** Most recent first, for the read-only month history view. */
export async function findClosedBudgetMonthsByUser(
  prisma: PrismaClient,
  userId: string,
): Promise<BudgetMonth[]> {
  const rows = await prisma.budgetMonth.findMany({
    where: { userId, status: "closed" },
    include: WITH_SNAPSHOT,
    orderBy: { month: "desc" },
  });
  return rows.map(toDomainBudgetMonth);
}

/**
 * Creates the month and its three snapshot collections in one write:
 * nested creates on a single top-level mutation run inside one DB
 * transaction, satisfying the atomicity docs/domain/architecture.md
 * requires for month operations without an explicit $transaction wrapper.
 */
export async function createBudgetMonth(
  prisma: PrismaClient,
  userId: string,
  budgetMonth: BudgetMonth,
): Promise<BudgetMonth> {
  const row = await prisma.budgetMonth.create({
    data: {
      userId,
      month: monthToDate(budgetMonth.month),
      status: budgetMonth.status,
      incomeCents: moneyToCents(budgetMonth.income),
      fixedEntries: { create: budgetMonth.fixedEntries.map(toPrismaSnapshotFixedEntryData) },
      envelopeBudgets: {
        create: budgetMonth.envelopeBudgets.map(toPrismaSnapshotEnvelopeBudgetData),
      },
      provisionTargets: {
        create: budgetMonth.provisionTargets.map(toPrismaSnapshotProvisionTargetData),
      },
    },
    include: WITH_SNAPSHOT,
  });
  return toDomainBudgetMonth(row);
}

/**
 * R26: locks the month while recording its leftover split (R25) and the
 * contributions that split toward a provision creates — in one transaction,
 * per docs/domain/architecture.md's "aucun état intermédiaire ne doit être
 * visible" for month operations.
 */
export async function closeBudgetMonth(
  prisma: PrismaClient,
  userId: string,
  month: Month,
  input: {
    closedAt: Date;
    allocations: LeftoverAllocationInput[];
    contributions: Omit<Contribution, "id">[];
  },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.budgetMonth.findFirst({
      where: { userId, month: monthToDate(month), status: "open" },
      select: { id: true },
    });
    if (!existing) {
      throw new Error("Open budget month not found for this user");
    }

    await tx.budgetMonth.update({
      where: { id: existing.id },
      data: { status: "closed", closedAt: input.closedAt },
    });

    if (input.allocations.length > 0) {
      await tx.leftoverAllocation.createMany({
        data: input.allocations.map((allocation) => ({
          budgetMonthId: existing.id,
          ...toPrismaLeftoverAllocationData(allocation),
        })),
      });
    }

    if (input.contributions.length > 0) {
      await tx.contribution.createMany({
        data: input.contributions.map((contribution) => ({
          userId,
          ...toPrismaContributionData(contribution),
        })),
      });
    }
  });
}

/** R29: unlocks a closed month again, without touching its frozen snapshot (R7). */
export async function reopenBudgetMonth(
  prisma: PrismaClient,
  userId: string,
  month: Month,
): Promise<void> {
  const updated = await prisma.budgetMonth.updateMany({
    where: { userId, month: monthToDate(month), status: "closed" },
    data: { status: "open", reopenedAt: new Date() },
  });
  if (updated.count === 0) {
    throw new Error("Closed budget month not found for this user");
  }
}
