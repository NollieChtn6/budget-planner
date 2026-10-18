import {
  findFixedEntriesByUser,
  findLeftoverAllocationsByUserAndMonth,
  findOpenBudgetMonthByUser,
  findVariableEnvelopesByUser,
  replaceBudgetMonthSnapshot,
} from "@budget/db";
import { computeCarriedOver, previousMonth, recalculateOpenMonthSnapshot } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";

/**
 * R7: after a poste fixe / enveloppe variable change takes effect "ce
 * mois-ci", the open month's snapshot must reflect it immediately rather
 * than only from next month's opening. A no-op when no month is open yet.
 * Session-free core, same split as `openMonthForUser` (actions/month.ts) —
 * testable without a request context, and shared by every mutation that can
 * affect the currently open month's snapshot (version add, archive, rename).
 */
export async function recalculateOpenMonthSnapshotForUser(
  prismaClient: PrismaClient,
  userId: string,
): Promise<void> {
  const budgetMonth = await findOpenBudgetMonthByUser(prismaClient, userId);
  if (!budgetMonth) return;

  const [fixedEntries, envelopes, previousMonthAllocations] = await Promise.all([
    findFixedEntriesByUser(prismaClient, userId),
    findVariableEnvelopesByUser(prismaClient, userId),
    findLeftoverAllocationsByUserAndMonth(prismaClient, userId, previousMonth(budgetMonth.month)),
  ]);

  const snapshot = recalculateOpenMonthSnapshot({
    budgetMonth,
    carriedOver: computeCarriedOver(previousMonthAllocations),
    fixedEntries,
    envelopes,
  });

  await replaceBudgetMonthSnapshot(prismaClient, userId, budgetMonth.month, snapshot);
}
