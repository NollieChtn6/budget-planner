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
 * R18 (deadline) / R21 (reserve) / R20 (late): the amount to set aside this
 * month. `balance` isn't computed here — Contribution and Expense don't exist
 * yet, so it's supplied by the caller, exactly like `hasOperationsInCurrentMonth`
 * is supplied to archiveProvision below.
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
    // R20: a late provision's due month has already passed, so there's no
    // "months remaining" to divide by — the whole remainder is due now.
    if (provision.status === "late") {
      return remaining;
    }
    const monthsRemaining = inclusiveMonthCount(currentMonth, dueMonth(provision));
    return ceilDivideMoney(remaining, monthsRemaining);
  }

  return moneyToCents(provision.monthlyAmount) < moneyToCents(remaining)
    ? provision.monthlyAmount
    : remaining;
}

/**
 * R20: a deadline provision becomes late when its due month is closed while
 * it's still active and incomplete. Called by the month-closing flow with the
 * month being closed and the provision's current balance.
 */
export function becomesLateAtMonthClose(
  provision: Provision,
  closingMonth: Month,
  balance: Money,
): boolean {
  return (
    provision.type === "deadline" &&
    provision.status === "active" &&
    isSameMonth(dueMonth(provision), closingMonth) &&
    moneyToCents(balance) < moneyToCents(provision.target)
  );
}

export type ExtendProvisionFailure =
  | { type: "notDeadlineProvision" }
  | { type: "notLate" }
  | { type: "newDueMonthNotAfterCurrent" };
export type ExtendProvisionResult =
  | { ok: true; provision: Provision & { type: "deadline" } }
  | { ok: false; error: ExtendProvisionFailure };

/**
 * R20 "Prolonger": pushes a late provision's due month back and returns it
 * to active. Implemented as a new `durationMonths` from the unchanged
 * `startMonth` (R17), so the new due month must be strictly after the
 * current one.
 */
export function extendProvision(provision: Provision, newDueMonth: Month): ExtendProvisionResult {
  if (provision.type !== "deadline") {
    return { ok: false, error: { type: "notDeadlineProvision" } };
  }
  if (provision.status !== "late") {
    return { ok: false, error: { type: "notLate" } };
  }
  if (!isMonthAfter(newDueMonth, dueMonth(provision))) {
    return { ok: false, error: { type: "newDueMonthNotAfterCurrent" } };
  }
  return {
    ok: true,
    provision: {
      ...provision,
      status: "active",
      durationMonths: inclusiveMonthCount(provision.startMonth, newDueMonth),
    },
  };
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
