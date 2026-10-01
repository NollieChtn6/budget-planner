import { floorPercentageOf, type Money, moneyFromCents, subtractMoney, sumMoney } from "../money";

/** R9: what's left of the income once every fixed entry is deducted. */
export function computeDisposableIncome(income: Money, fixedEntryAmounts: Money[]): Money {
  return subtractMoney(income, sumMoney(fixedEntryAmounts));
}

/** R11: the amount percentage-mode envelopes apply their share to. Can be negative (R13). */
export function computeAllocationBase(
  disposableIncome: Money,
  amountModeEnvelopeValues: Money[],
): Money {
  return subtractMoney(disposableIncome, sumMoney(amountModeEnvelopeValues));
}

/**
 * R12, R2: each percentage rounds down to the cent. R13: a negative allocation
 * base forces every percentage-mode budget to 0 instead of a negative amount.
 */
export function computePercentageEnvelopeBudgets(
  allocationBase: Money,
  percentages: number[],
): Money[] {
  if (allocationBase.cents < 0) {
    return percentages.map(() => moneyFromCents(0));
  }
  return percentages.map((percentage) => floorPercentageOf(allocationBase, percentage));
}

/** R12: the share of the allocation base left uncovered by percentage-mode envelopes. */
export function computeUnallocated(
  allocationBase: Money,
  percentageEnvelopeBudgets: Money[],
): Money {
  return subtractMoney(allocationBase, sumMoney(percentageEnvelopeBudgets));
}

/**
 * R14: purely indicative feasibility signal, never a blocker when negative.
 * `envelopeBudgets` excludes the unallocated share; provision targets are
 * added as objectives, not deducted from disposableIncome like fixed entries.
 */
export function computeForecastMargin(
  disposableIncome: Money,
  envelopeBudgets: Money[],
  provisionTargets: Money[],
): Money {
  return subtractMoney(
    subtractMoney(disposableIncome, sumMoney(envelopeBudgets)),
    sumMoney(provisionTargets),
  );
}
