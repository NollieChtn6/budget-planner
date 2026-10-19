import {
  findContributionsByUserAndMonth,
  findExtraIncomesByUserAndMonth,
  findLeftoverAllocationsByUserAndMonth,
  findReimbursementsByUserAndMonth,
  findSavingsTransfersByUserAndMonth,
} from "@budget/db";
import {
  type BudgetMonth,
  computeCarriedOver,
  computeDisposableIncome,
  type Money,
  previousMonth,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import type { OperationActionState } from "@/actions/operation-state";

const NEGATIVE_DISPOSABLE_INCOME_WARNING =
  "Attention : ton reste à vivre du mois est négatif après cette opération.";

/**
 * R9: the disposable income of an open month as it stands in the database,
 * extra incomes, savings transfers and contributions taken from it included.
 */
export async function computeStoredDisposableIncome(
  prismaClient: PrismaClient,
  userId: string,
  budgetMonth: Pick<BudgetMonth, "month" | "income" | "fixedEntries">,
): Promise<Money> {
  const [previousAllocations, reimbursements, extraIncomes, savingsTransfers, contributions] =
    await Promise.all([
      findLeftoverAllocationsByUserAndMonth(prismaClient, userId, previousMonth(budgetMonth.month)),
      findReimbursementsByUserAndMonth(prismaClient, userId, budgetMonth.month),
      findExtraIncomesByUserAndMonth(prismaClient, userId, budgetMonth.month),
      findSavingsTransfersByUserAndMonth(prismaClient, userId, budgetMonth.month),
      findContributionsByUserAndMonth(prismaClient, userId, budgetMonth.month),
    ]);

  return computeDisposableIncome(
    budgetMonth.income,
    computeCarriedOver(previousAllocations),
    budgetMonth.fixedEntries.map((entry) => entry.amount),
    [...reimbursements, ...extraIncomes].map((inflow) => inflow.amount),
    [
      ...savingsTransfers.map((transfer) => transfer.amount),
      ...contributions
        .filter((contribution) => contribution.origin === "disposableIncome")
        .map((contribution) => contribution.amount),
    ],
  );
}

/** R37: the success state of an operation that takes money from the disposable income, with the negative-balance warning when it applies. */
export async function successWithDisposableIncomeWarning(
  prismaClient: PrismaClient,
  userId: string,
  budgetMonth: Pick<BudgetMonth, "month" | "income" | "fixedEntries">,
  message: string,
): Promise<OperationActionState> {
  const disposableIncome = await computeStoredDisposableIncome(prismaClient, userId, budgetMonth);
  return {
    status: "success",
    message,
    ...(disposableIncome.cents < 0 ? { warning: NEGATIVE_DISPOSABLE_INCOME_WARNING } : {}),
  };
}
