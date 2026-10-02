import { type Money, moneyToCents, subtractMoney, sumMoney } from "../money";

/** R15: total of this month's expenses on an envelope. */
export function computeSpent(expenseAmounts: Money[]): Money {
  return sumMoney(expenseAmounts);
}

/** R15: what's left of the envelope's budget. Can be negative. */
export function computeRemaining(budget: Money, spent: Money): Money {
  return subtractMoney(budget, spent);
}

export type ConsumptionLevel = "ok" | "watch" | "caution" | "warning" | "critical" | "exceeded";

/**
 * R16: alert level from the consumption rate (spent / budget). Compared as
 * integer cents (spent * 1000 vs budget * permille) to avoid float rounding
 * at the table's boundaries.
 */
export function computeConsumptionLevel(budget: Money, spent: Money): ConsumptionLevel {
  const budgetCents = moneyToCents(budget);
  const spentCents = moneyToCents(spent);

  if (budgetCents <= 0) {
    return spentCents > 0 ? "exceeded" : "ok";
  }
  if (spentCents * 1000 < budgetCents * 500) return "ok";
  if (spentCents * 1000 < budgetCents * 600) return "watch";
  if (spentCents * 1000 < budgetCents * 750) return "caution";
  if (spentCents * 1000 < budgetCents * 850) return "warning";
  if (spentCents <= budgetCents) return "critical";
  return "exceeded";
}
