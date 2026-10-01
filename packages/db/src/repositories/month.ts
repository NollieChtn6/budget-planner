import type { BudgetMonth, Month } from "@budget/domain";
import { moneyToCents } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
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
