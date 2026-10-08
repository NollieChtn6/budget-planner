import { ceilDivideMoney, type Money, moneyFromCents, moneyToCents, subtractMoney } from "../money";
import {
  addMonths,
  inclusiveMonthCount,
  isMonthAfter,
  isSameMonth,
  type Month,
  nextMonth,
} from "../month";

export type ProvisionStatus = "active" | "late" | "closed";

type ProvisionCommon = {
  id: string;
  label: string;
  target: Money;
  status: ProvisionStatus;
  archivedFrom?: Month;
  previousCycleId?: string;
};

export type Provision = ProvisionCommon &
  (
    | { type: "deadline"; startMonth: Month; durationMonths: number }
    | { type: "reserve"; monthlyAmount: Money }
  );

/** R17: the due month is also the month the planned expense happens. */
export function dueMonth(provision: Provision & { type: "deadline" }): Month {
  return addMonths(provision.startMonth, provision.durationMonths - 1);
}

/**
 * R18 (deadline) / R21 (reserve): the amount to set aside this month.
 * `balance` isn't computed here — Contribution and Expense don't exist yet,
 * so it's supplied by the caller, exactly like `hasOperationsInCurrentMonth`
 * is supplied to archiveProvision below. Assumes currentMonth is at or
 * before dueMonth for a deadline provision — the "late" case (R20) is out
 * of scope, and currentMonth after dueMonth is not a case this function
 * guards against.
 */
export function computeMonthlyTarget(
  provision: Provision,
  currentMonth: Month,
  balance: Money,
): Money {
  if (moneyToCents(balance) >= moneyToCents(provision.target)) {
    return moneyFromCents(0);
  }

  const remaining = subtractMoney(provision.target, balance);

  if (provision.type === "deadline") {
    const monthsRemaining = inclusiveMonthCount(currentMonth, dueMonth(provision));
    return ceilDivideMoney(remaining, monthsRemaining);
  }

  return moneyToCents(provision.monthlyAmount) < moneyToCents(remaining)
    ? provision.monthlyAmount
    : remaining;
}

export type ArchiveProvisionInput = { effectiveFrom: Month; hasOperationsInCurrentMonth: boolean };
export type ArchiveProvisionFailure = { type: "invalidArchiveDate"; allowed: Month[] };
export type ArchiveProvisionResult =
  | { ok: true; provision: Provision }
  | { ok: false; error: ArchiveProvisionFailure };

/**
 * R8: archiving takes effect the current month, unless the provision already
 * has an operation this month, in which case it must wait until next month.
 */
export function archiveProvision(
  provision: Provision,
  input: ArchiveProvisionInput,
  currentMonth: Month,
): ArchiveProvisionResult {
  const allowedDates = input.hasOperationsInCurrentMonth
    ? [nextMonth(currentMonth)]
    : [currentMonth, nextMonth(currentMonth)];

  if (!allowedDates.some((date) => isSameMonth(date, input.effectiveFrom))) {
    return { ok: false, error: { type: "invalidArchiveDate", allowed: allowedDates } };
  }

  return { ok: true, provision: { ...provision, archivedFrom: input.effectiveFrom } };
}

/**
 * R23: an expense "empties" a deadline provision when its balance was
 * positive and drops to exactly 0 as a result. A reserve is never prompted
 * (R23, last line): it simply refills per R21.
 */
export function isProvisionExhaustedBy(
  provision: Provision,
  balanceBefore: Money,
  balanceAfter: Money,
): boolean {
  return (
    provision.type === "deadline" &&
    provision.status !== "closed" &&
    moneyToCents(balanceBefore) > 0 &&
    moneyToCents(balanceAfter) === 0
  );
}

export type ProvisionChoiceFailure = { type: "notDeadlineProvision" };

export type CloseProvisionResult =
  | { ok: true; provision: Provision }
  | { ok: false; error: ProvisionChoiceFailure };

/** R23 "Clôturer": ends this provision's lifecycle — it won't appear in any future month's snapshot (R18/R21). */
export function closeProvision(provision: Provision): CloseProvisionResult {
  if (provision.type !== "deadline") {
    return { ok: false, error: { type: "notDeadlineProvision" } };
  }
  return { ok: true, provision: { ...provision, status: "closed" } };
}

export type RenewProvisionResult =
  | {
      ok: true;
      closedProvision: Provision;
      newProvision: {
        label: string;
        type: "deadline";
        target: Money;
        startMonth: Month;
        durationMonths: number;
        previousCycleId: string;
      };
    }
  | { ok: false; error: ProvisionChoiceFailure };

/** R23 "Renouveler": closes this cycle and starts an identical one next month, same target and duration. */
export function renewProvision(provision: Provision, currentMonth: Month): RenewProvisionResult {
  if (provision.type !== "deadline") {
    return { ok: false, error: { type: "notDeadlineProvision" } };
  }
  return {
    ok: true,
    closedProvision: { ...provision, status: "closed" },
    newProvision: {
      label: provision.label,
      type: "deadline",
      target: provision.target,
      startMonth: nextMonth(currentMonth),
      durationMonths: provision.durationMonths,
      previousCycleId: provision.id,
    },
  };
}

export type UnarchiveProvisionFailure = { type: "notArchivedOrAlreadyEffective" };
export type UnarchiveProvisionResult =
  | { ok: true; provision: Provision }
  | { ok: false; error: UnarchiveProvisionFailure };

/** R8: reversible only while the archive date hasn't taken effect yet. */
export function unarchiveProvision(
  provision: Provision,
  currentMonth: Month,
): UnarchiveProvisionResult {
  if (!provision.archivedFrom || !isMonthAfter(provision.archivedFrom, currentMonth)) {
    return { ok: false, error: { type: "notArchivedOrAlreadyEffective" } };
  }
  const { archivedFrom: _archivedFrom, ...rest } = provision;
  return { ok: true, provision: rest };
}
