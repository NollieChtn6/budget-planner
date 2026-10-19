import { type CalendarDate, monthOfCalendarDate } from "../calendar-date";
import { type Money, moneyToCents } from "../money";
import { isSameMonth, type Month } from "../month";

export type Contribution = {
  id: string;
  date: CalendarDate;
  amount: Money;
  provisionId: string;
  /**
   * `closing`: created by the month-closing leftover allocation (R25).
   * `disposableIncome`: entered by hand, taken from the disposable income (R37).
   * `manual`: entered before R37, doesn't touch the disposable income.
   */
  origin: "manual" | "closing" | "disposableIncome";
};

export type RecordContributionInput = {
  date: CalendarDate;
  amount: Money;
  provisionId: string;
};

/**
 * `snapshotProvisionIds` are the provisions actually part of this month's
 * frozen instantané (docs/domain/model.md), not the live parameterization.
 */
export type RecordContributionContext = {
  currentMonth: Month;
  snapshotProvisionIds: string[];
};

export type RecordContributionFailure =
  | { type: "invalidAmount" }
  | { type: "dateOutsideCurrentMonth" }
  | { type: "provisionNotInSnapshot" };

export type RecordContributionResult =
  | { ok: true; contribution: Omit<Contribution, "id"> }
  | { ok: false; error: RecordContributionFailure };

/**
 * A contribution created by a month closing (R25) is a frozen receipt of
 * that closing's leftover split, paired with a LeftoverAllocation — only a
 * contribution entered by hand can be revised or removed.
 */
export function canModifyContribution(contribution: Pick<Contribution, "origin">): boolean {
  return contribution.origin !== "closing";
}

/**
 * R3: a contribution is attached to the budget month of its date. R37: one
 * entered by hand is taken from the disposable income.
 */
export function recordContribution(
  input: RecordContributionInput,
  context: RecordContributionContext,
): RecordContributionResult {
  if (moneyToCents(input.amount) <= 0) {
    return { ok: false, error: { type: "invalidAmount" } };
  }

  if (!isSameMonth(monthOfCalendarDate(input.date), context.currentMonth)) {
    return { ok: false, error: { type: "dateOutsideCurrentMonth" } };
  }

  if (!context.snapshotProvisionIds.includes(input.provisionId)) {
    return { ok: false, error: { type: "provisionNotInSnapshot" } };
  }

  return {
    ok: true,
    contribution: {
      date: input.date,
      amount: input.amount,
      provisionId: input.provisionId,
      origin: "disposableIncome",
    },
  };
}
