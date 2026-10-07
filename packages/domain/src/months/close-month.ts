import type { CalendarDate } from "../calendar-date";
import { type Money, moneyFromCents, moneyToCents, sumMoney } from "../money";
import type { Contribution } from "../operations/contribution";

/** R24: the leftover sums every variable envelope's remainder, negative included. */
export function computeLeftover(envelopeRemainders: Money[]): Money {
  return sumMoney(envelopeRemainders);
}

/** R30: a negative leftover counts as financed by savings this month; 0 otherwise. */
export function computeSavingsFundedAmount(leftover: Money): Money {
  return moneyToCents(leftover) < 0 ? moneyFromCents(-moneyToCents(leftover)) : moneyFromCents(0);
}

export type LeftoverAllocation =
  | { destination: "savings"; amount: Money }
  | { destination: "provision"; provisionId: string; amount: Money };

export type CloseMonthInput = {
  date: CalendarDate;
  allocations: LeftoverAllocation[];
  /** The month's frozen instantané (docs/domain/model.md), not the live provision list. */
  snapshotProvisionIds: string[];
};

export type CloseMonthFailure =
  | { type: "invalidAllocationAmount" }
  | { type: "provisionNotInSnapshot" };

export type CloseMonthResult =
  | { ok: true; allocations: LeftoverAllocation[]; contributions: Omit<Contribution, "id">[] }
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
      (allocation): allocation is Extract<LeftoverAllocation, { destination: "provision" }> =>
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
