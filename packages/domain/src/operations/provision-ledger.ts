import { type Money, moneyFromCents, moneyToCents, subtractMoney, sumMoney } from "../money";

type ProvisionExpense = { amount: Money; savingsDraw?: Money };

/**
 * Derived, never stored (docs/domain/model.md): a provision's balance is the
 * sum of every contribution ever made to it, minus what each expense on it
 * actually drew from it (R22) — the part financed by savings doesn't count.
 */
export function computeProvisionBalance(
  contributions: Money[],
  expenses: ProvisionExpense[],
): Money {
  const totalContributions = sumMoney(contributions);
  const totalConsumed = sumMoney(
    expenses.map((expense) =>
      subtractMoney(expense.amount, expense.savingsDraw ?? moneyFromCents(0)),
    ),
  );
  return subtractMoney(totalContributions, totalConsumed);
}

/**
 * R19: contributions above this month's target produce a surplus (shown as
 * an advance). Negative means the target isn't met yet this month.
 */
export function computeContributionSurplus(target: Money, paidThisMonth: Money): Money {
  return subtractMoney(paidThisMonth, target);
}

/** R28: a provision counts as pointed for the month once it's fully funded. */
export function isProvisionDone(target: Money, paidThisMonth: Money): boolean {
  return moneyToCents(paidThisMonth) >= moneyToCents(target);
}

/**
 * R14: what is still to be put aside for the month once the contributions
 * already deducted from disposableIncome (R37) are counted, so they aren't
 * subtracted twice from the forecast margin. A surplus leaves 0, not a
 * negative amount.
 */
export function computeRemainingProvisionTarget(target: Money, deductedThisMonth: Money): Money {
  return moneyToCents(deductedThisMonth) >= moneyToCents(target)
    ? moneyFromCents(0)
    : subtractMoney(target, deductedThisMonth);
}
