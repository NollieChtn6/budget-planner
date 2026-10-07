import type { CalendarDate } from "../calendar-date";
import { type Money, moneyFromCents, moneyToCents, sumMoney } from "../money";
import type { Contribution } from "../operations/contribution";
import type { BudgetMonthStatus } from "./open-month";

/** R24: the leftover sums every variable envelope's remainder, negative included. */
export function computeLeftover(envelopeRemainders: Money[]): Money {
  return sumMoney(envelopeRemainders);
}

/** R30: a negative leftover counts as financed by savings this month; 0 otherwise. */
export function computeSavingsFundedAmount(leftover: Money): Money {
  return moneyToCents(leftover) < 0 ? moneyFromCents(-moneyToCents(leftover)) : moneyFromCents(0);
}

export type LeftoverAllocationInput =
  | { destination: "savings"; amount: Money }
  | { destination: "provision"; provisionId: string; amount: Money };

export type LeftoverAllocation = LeftoverAllocationInput & { id: string };

export type CloseMonthInput = {
  date: CalendarDate;
  allocations: LeftoverAllocationInput[];
  /** The month's frozen instantané (docs/domain/model.md), not the live provision list. */
  snapshotProvisionIds: string[];
};

export type CloseMonthFailure =
  | { type: "invalidAllocationAmount" }
  | { type: "provisionNotInSnapshot" };

export type CloseMonthResult =
  | { ok: true; allocations: LeftoverAllocationInput[]; contributions: Omit<Contribution, "id">[] }
  | { ok: false; error: CloseMonthFailure };

/**
 * R25: the leftover (R24) can be split toward savings or provisions — a
 * provision split also creates a same-day contribution (origin "closing").
 * Splitting more than the leftover is only a UI-level warning, never a
 * rejection here. R26 (locking the month) and R30 (the savings-funded
 * amount) are the caller's/UI's concern: both are derived, never stored
 * (docs/domain/model.md), so there's nothing left for this function to do
 * once the allocations are validated.
 */
export function closeMonth(input: CloseMonthInput): CloseMonthResult {
  for (const allocation of input.allocations) {
    if (moneyToCents(allocation.amount) <= 0) {
      return { ok: false, error: { type: "invalidAllocationAmount" } };
    }
    if (
      allocation.destination === "provision" &&
      !input.snapshotProvisionIds.includes(allocation.provisionId)
    ) {
      return { ok: false, error: { type: "provisionNotInSnapshot" } };
    }
  }

  const contributions: Omit<Contribution, "id">[] = input.allocations
    .filter(
      (allocation): allocation is Extract<LeftoverAllocationInput, { destination: "provision" }> =>
        allocation.destination === "provision",
    )
    .map((allocation) => ({
      date: input.date,
      amount: allocation.amount,
      provisionId: allocation.provisionId,
      origin: "closing" as const,
    }));

  return { ok: true, allocations: input.allocations, contributions };
}

export type ReopenMonthFailure = { type: "notClosed" };
export type ReopenMonthResult = { ok: true } | { ok: false; error: ReopenMonthFailure };

/**
 * R29: only the last closed month can be reopened — in this app's V1 (no
 * multi-month navigation, see issue #11), the only month ever addressable is
 * the real current one, so "closed" already implies "the last closed month".
 * What becomes modifiable again (income, expenses, contributions, pointage —
 * never the frozen snapshot, R7) and how a later re-closing revalidates the
 * leftover split (R25) are the caller's concern: there's nothing else to
 * validate here.
 */
export function reopenMonth(status: BudgetMonthStatus): ReopenMonthResult {
  if (status !== "closed") {
    return { ok: false, error: { type: "notClosed" } };
  }
  return { ok: true };
}
