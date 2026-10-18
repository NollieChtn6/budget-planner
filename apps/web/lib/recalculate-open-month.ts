import {
  findContributionsByUserAndProvision,
  findExpensesByUserAndProvision,
  findFixedEntriesByUser,
  findLeftoverAllocationsByUserAndMonth,
  findOpenBudgetMonthByUser,
  findProvisionsByUser,
  findVariableEnvelopesByUser,
  replaceBudgetMonthSnapshot,
} from "@budget/db";
import {
  computeCarriedOver,
  computeProvisionBalance,
  previousMonth,
  recalculateOpenMonthSnapshot,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";

/**
 * R7/R5: after a poste fixe / enveloppe variable change takes effect "ce
 * mois-ci", or a provision becomes active this month (just created, or
 * un-archived in time), the open month's snapshot must reflect it
 * immediately rather than only from next month's opening. A no-op when no
 * month is open yet. Session-free core, same split as `openMonthForUser`
 * (actions/month.ts) — testable without a request context, and shared by
 * every mutation that can affect the currently open month's snapshot
 * (version add, archive, rename, provision creation).
 */
export async function recalculateOpenMonthSnapshotForUser(
  prismaClient: PrismaClient,
  userId: string,
): Promise<void> {
  const budgetMonth = await findOpenBudgetMonthByUser(prismaClient, userId);
  if (!budgetMonth) return;

  const [fixedEntries, envelopes, previousMonthAllocations, provisions] = await Promise.all([
    findFixedEntriesByUser(prismaClient, userId),
    findVariableEnvelopesByUser(prismaClient, userId),
    findLeftoverAllocationsByUserAndMonth(prismaClient, userId, previousMonth(budgetMonth.month)),
    findProvisionsByUser(prismaClient, userId),
  ]);

  const provisionsWithBalance = await Promise.all(
    provisions.map(async (provision) => {
      const [contributions, expenses] = await Promise.all([
        findContributionsByUserAndProvision(prismaClient, userId, provision.id),
        findExpensesByUserAndProvision(prismaClient, userId, provision.id),
      ]);
      return {
        ...provision,
        balance: computeProvisionBalance(
          contributions.map((c) => c.amount),
          expenses,
        ),
      };
    }),
  );

  const snapshot = recalculateOpenMonthSnapshot({
    budgetMonth,
    carriedOver: computeCarriedOver(previousMonthAllocations),
    fixedEntries,
    envelopes,
    provisions: provisionsWithBalance,
  });

  await replaceBudgetMonthSnapshot(prismaClient, userId, budgetMonth.month, snapshot);
}
