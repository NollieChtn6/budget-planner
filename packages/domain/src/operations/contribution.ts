import { type CalendarDate, monthOfCalendarDate } from "../calendar-date";
import { type Money, moneyToCents } from "../money";
import { isSameMonth, type Month } from "../month";

export type Contribution = {
  id: string;
  date: CalendarDate;
  amount: Money;
  provisionId: string;
  /** `closing`: created by the month-closing leftover allocation (R25) — not produced yet, see issue #11. */
  origin: "manual" | "closing";
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
 * manually-entered contribution can be revised or removed.
 */
export function canModifyContribution(contribution: Pick<Contribution, "origin">): boolean {
  return contribution.origin === "manual";
}

/** R3: a contribution is attached to the budget month of its date. */
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
      origin: "manual",
    },
  };
}
