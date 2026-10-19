import {
  addMoney,
  floorPercentageOf,
  type Money,
  moneyFromCents,
  subtractMoney,
  sumMoney,
} from "../money";

/**
 * R9: what's left of the income, plus whatever was carried over from last
 * month's closing (R32) and the month's one-off inflows (reimbursements R35,
 * extra incomes R36), once every fixed entry and every withdrawal (savings
 * transfers and contributions taken from it, R37) is deducted. The month
 * snapshot (R5) is computed without any of these, which only arrive once the
 * month is open.
 */
export function computeDisposableIncome(
  income: Money,
  carriedOver: Money,
  fixedEntryAmounts: Money[],
  oneOffInflowAmounts: Money[] = [],
  withdrawalAmounts: Money[] = [],
): Money {
  return subtractMoney(
    addMoney(addMoney(income, carriedOver), sumMoney(oneOffInflowAmounts)),
    addMoney(sumMoney(fixedEntryAmounts), sumMoney(withdrawalAmounts)),
  );
}

/**
 * R11: the amount percentage-mode envelopes apply their share to. Can be
 * negative (R13). The one-off inflows and withdrawals (R35, R36, R37) move
 * `disposableIncome` but never the base, so they leave the envelope budgets
 * untouched.
 */
export function computeAllocationBase(
  disposableIncome: Money,
  amountModeEnvelopeValues: Money[],
  oneOffInflowAmounts: Money[] = [],
  withdrawalAmounts: Money[] = [],
): Money {
  return subtractMoney(
    addMoney(
      subtractMoney(disposableIncome, sumMoney(oneOffInflowAmounts)),
      sumMoney(withdrawalAmounts),
    ),
    sumMoney(amountModeEnvelopeValues),
  );
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
 * `envelopeBudgets` excludes the unallocated share; `provisionTargets` are the
 * remaining targets (see `computeRemainingProvisionTarget`), objectives not
 * deducted from disposableIncome like fixed entries.
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
