import {
  findContributionsByUserAndMonth,
  findExpensesByUserAndMonth,
  findLeftoverAllocationsByUserAndMonth,
} from "@budget/db";
import {
  addMoney,
  type BudgetMonth,
  type ConsumptionLevel,
  computeConsumptionLevel,
  computeLeftover,
  computeRemaining,
  computeSavingsFundedAmount,
  computeSpent,
  type Expense,
  type Money,
  type SnapshotEnvelopeBudget,
  sumMoney,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";

export type EnvelopeSummary = SnapshotEnvelopeBudget & {
  spent: Money;
  remaining: Money;
  level: ConsumptionLevel;
};

export type MonthSummary = {
  income: Money;
  spent: Money;
  saved: Money;
  leftover: Money;
  savingsDraw: Money;
  envelopes: EnvelopeSummary[];
};

/**
 * Aggregate figures for a closed month (Historique's list and detail views):
 * revenue, total spent, total saved (scheduled savings + provision
 * contributions + any leftover sent to savings at closing), and the envelope
 * reliquat.
 */
export async function computeMonthSummary(
  prisma: PrismaClient,
  userId: string,
  budgetMonth: BudgetMonth,
): Promise<MonthSummary> {
  const [expenses, contributions, allocations] = await Promise.all([
    findExpensesByUserAndMonth(prisma, userId, budgetMonth.month),
    findContributionsByUserAndMonth(prisma, userId, budgetMonth.month),
    findLeftoverAllocationsByUserAndMonth(prisma, userId, budgetMonth.month),
  ]);

  const envelopes: EnvelopeSummary[] = budgetMonth.envelopeBudgets.map((entry) => {
    const spent = computeSpent(
      expenses
        .filter(
          (expense): expense is Expense & { source: { type: "envelope"; envelopeId: string } } =>
            expense.source.type === "envelope" && expense.source.envelopeId === entry.envelopeId,
        )
        .map((expense) => expense.amount),
    );
    return {
      ...entry,
      spent,
      remaining: computeRemaining(entry.budget, spent),
      level: computeConsumptionLevel(entry.budget, spent),
    };
  });

  const leftover = computeLeftover(envelopes.map((entry) => entry.remaining));
  const savingsDraw = computeSavingsFundedAmount(leftover);

  const scheduledSavingTotal = sumMoney(
    budgetMonth.fixedEntries
      .filter((entry) => entry.type === "scheduledSaving")
      .map((entry) => entry.amount),
  );
  const contributionsTotal = sumMoney(contributions.map((c) => c.amount));
  const leftoverToSavings = sumMoney(
    allocations.filter((a) => a.destination === "savings").map((a) => a.amount),
  );
  const saved = addMoney(addMoney(scheduledSavingTotal, contributionsTotal), leftoverToSavings);

  const spent = sumMoney(expenses.map((e) => e.amount));

  return { income: budgetMonth.income, spent, saved, leftover, savingsDraw, envelopes };
}
