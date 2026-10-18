import {
  activeFixedEntryVersionAt,
  type FixedEntry,
  type FixedEntryType,
} from "../budget/fixed-entry";
import {
  computeAllocationBase,
  computeDisposableIncome,
  computeForecastMargin,
  computePercentageEnvelopeBudgets,
  computeUnallocated,
} from "../budget/month-budget";
import { activeVersionAt, type VariableEnvelope } from "../budget/variable-envelope";
import type { Money } from "../money";
import { isMonthBefore, type Month } from "../month";
import { computeMonthlyTarget, type Provision } from "../provisions/provision";

export type BudgetMonthStatus = "open" | "closed";

export type PointageStatus = "planned" | "done";

export type SnapshotFixedEntry = {
  fixedEntryId: string;
  label: string;
  type: FixedEntryType;
  amount: Money;
  status: PointageStatus;
};

export type SnapshotEnvelopeBudget = {
  envelopeId: string;
  label: string;
  budget: Money;
} & ({ mode: "amount"; value: Money } | { mode: "percentage"; value: number });

export type SnapshotProvisionTarget = {
  provisionId: string;
  label: string;
  target: Money;
};

/**
 * `openedAt`/`closedAt`/`reopenedAt` from docs/domain/model.md are real
 * timestamps, not AAAA-MM values — ADR-0007 keeps those out of the domain
 * layer entirely. They exist only as Prisma columns, set by the persistence
 * layer when a month is actually written or transitioned.
 */
export type BudgetMonth = {
  month: Month;
  status: BudgetMonthStatus;
  income: Money;
  fixedEntries: SnapshotFixedEntry[];
  envelopeBudgets: SnapshotEnvelopeBudget[];
  provisionTargets: SnapshotProvisionTarget[];
};

export type OpenMonthInput = {
  month: Month;
  income: Money;
  /** R4: status of the previous calendar month, resolved by the caller. */
  previousMonthStatus: "closed" | "open" | "none";
  /** R32: previous month's leftover left without a destination, 0 if none or no previous month. */
  carriedOver: Money;
  fixedEntries: FixedEntry[];
  envelopes: VariableEnvelope[];
  /**
   * Balance supplied by the caller, like `hasOperationsInCurrentMonth` is to
   * `archiveProvision`. It is always 0 in practice at this stage: Contribution
   * and Expense don't exist yet, and R4 never allows opening a second month
   * before the first is closed, so no provision can have received a payment
   * before this very first opening.
   */
  provisions: (Provision & { balance: Money })[];
};

export type PointFixedEntryFailure = { type: "fixedEntryNotInSnapshot" };

export type PointFixedEntryResult =
  | { ok: true; fixedEntries: SnapshotFixedEntry[] }
  | { ok: false; error: PointFixedEntryFailure };

/**
 * R27: toggles a fixed entry's pointage between "planned" and "done".
 * Reversible both ways, as in the maquette's checkbox and R29's allowance to
 * correct pointage on a reopened month.
 */
export function pointFixedEntry(
  fixedEntries: SnapshotFixedEntry[],
  fixedEntryId: string,
  done: boolean,
): PointFixedEntryResult {
  if (!fixedEntries.some((entry) => entry.fixedEntryId === fixedEntryId)) {
    return { ok: false, error: { type: "fixedEntryNotInSnapshot" } };
  }
  const status: PointageStatus = done ? "done" : "planned";
  return {
    ok: true,
    fixedEntries: fixedEntries.map((entry) =>
      entry.fixedEntryId === fixedEntryId ? { ...entry, status } : entry,
    ),
  };
}

export type OpenMonthFailure = { type: "previousMonthNotClosed" };

export type OpenMonthResult =
  | {
      ok: true;
      budgetMonth: BudgetMonth;
      derived: {
        disposableIncome: Money;
        allocationBase: Money;
        /** R13: signals that percentage-mode envelopes were forced to 0. */
        allocationBaseNegative: boolean;
        unallocated: Money;
        forecastMargin: Money;
      };
    }
  | { ok: false; error: OpenMonthFailure };

/** R23 "Clôturer"/"Renouveler": a closed provision's cycle has ended and never reappears. */
function isProvisionActiveAt(provision: Provision, month: Month): boolean {
  return (
    provision.status !== "closed" &&
    (!provision.archivedFrom || isMonthBefore(month, provision.archivedFrom))
  );
}

/**
 * The fixed-entry half of a month's snapshot (R5): each active entry's
 * current label/type/amount, with pointage status resolved by the caller —
 * "planned" at opening (R27), or preserved from the existing snapshot when
 * recalculating an already-open month (R7).
 */
function buildFixedEntriesSnapshot(
  fixedEntries: FixedEntry[],
  month: Month,
  statusFor: (fixedEntryId: string) => PointageStatus,
): SnapshotFixedEntry[] {
  return fixedEntries.flatMap((fixedEntry) => {
    const version = activeFixedEntryVersionAt(fixedEntry, month);
    if (!version) return [];
    return [
      {
        fixedEntryId: fixedEntry.id,
        label: version.label,
        type: fixedEntry.type,
        amount: version.amount,
        status: statusFor(fixedEntry.id),
      },
    ];
  });
}

/**
 * The envelope half of a month's snapshot (R10-R13): each active envelope's
 * current label/mode/value and its computed budget, plus the allocation
 * values (R11, R13) and unallocated share (R12) it took to get there.
 */
function buildEnvelopeBudgetsSnapshot(
  envelopes: VariableEnvelope[],
  month: Month,
  disposableIncome: Money,
): {
  envelopeBudgets: SnapshotEnvelopeBudget[];
  allocationBase: Money;
  allocationBaseNegative: boolean;
  unallocated: Money;
} {
  const activeEnvelopes = envelopes.flatMap((envelope) => {
    const version = activeVersionAt(envelope, month);
    return version ? [{ envelope, version }] : [];
  });

  const amountModeValues = activeEnvelopes
    .filter((entry) => entry.version.mode === "amount")
    .map((entry) => entry.version.value as Money);

  const allocationBase = computeAllocationBase(disposableIncome, amountModeValues);
  const allocationBaseNegative = allocationBase.cents < 0;

  const percentageEntries = activeEnvelopes.filter((entry) => entry.version.mode === "percentage");
  const percentageBudgets = computePercentageEnvelopeBudgets(
    allocationBase,
    percentageEntries.map((entry) => entry.version.value as number),
  );
  const percentageBudgetByEnvelopeId = new Map(
    percentageEntries.map((entry, index) => [entry.envelope.id, percentageBudgets[index] as Money]),
  );

  const envelopeBudgets: SnapshotEnvelopeBudget[] = activeEnvelopes.map(({ envelope, version }) => {
    if (version.mode === "amount") {
      return {
        envelopeId: envelope.id,
        label: version.label,
        mode: "amount",
        value: version.value,
        budget: version.value,
      };
    }
    const budget = percentageBudgetByEnvelopeId.get(envelope.id);
    if (!budget) {
      throw new Error(`Missing computed percentage budget for envelope ${envelope.id}`);
    }
    return {
      envelopeId: envelope.id,
      label: version.label,
      mode: "percentage",
      value: version.value,
      budget,
    };
  });

  const unallocated = computeUnallocated(
    allocationBase,
    envelopeBudgets.filter((entry) => entry.mode === "percentage").map((entry) => entry.budget),
  );

  return { envelopeBudgets, allocationBase, allocationBaseNegative, unallocated };
}

/**
 * R4: validates the previous month's status, then freezes the snapshot (R5)
 * — fixed entries (R27: status starts at "planned"), envelope budgets
 * (R10-R13, R32's carried-over report flows into disposableIncome and so into
 * percentage-mode budgets via the allocation base), and provision targets
 * (R18, R21) — and computes the month's derived values (R9, R14) from that
 * same snapshot. The envelope bonus (R31) isn't part of this: it never
 * changes the snapshot's budget, only what's displayed alongside it (see
 * `computeEnvelopeBonus`).
 */
export function openMonth(input: OpenMonthInput): OpenMonthResult {
  if (input.previousMonthStatus === "open") {
    return { ok: false, error: { type: "previousMonthNotClosed" } };
  }

  const fixedEntries = buildFixedEntriesSnapshot(input.fixedEntries, input.month, () => "planned");

  const disposableIncome = computeDisposableIncome(
    input.income,
    input.carriedOver,
    fixedEntries.map((entry) => entry.amount),
  );

  const { envelopeBudgets, allocationBase, allocationBaseNegative, unallocated } =
    buildEnvelopeBudgetsSnapshot(input.envelopes, input.month, disposableIncome);

  const provisionTargets: SnapshotProvisionTarget[] = input.provisions
    .filter((provision) => isProvisionActiveAt(provision, input.month))
    .map((provision) => ({
      provisionId: provision.id,
      label: provision.label,
      target: computeMonthlyTarget(provision, input.month, provision.balance),
    }));

  const forecastMargin = computeForecastMargin(
    disposableIncome,
    envelopeBudgets.map((entry) => entry.budget),
    provisionTargets.map((entry) => entry.target),
  );

  return {
    ok: true,
    budgetMonth: {
      month: input.month,
      status: "open",
      income: input.income,
      fixedEntries,
      envelopeBudgets,
      provisionTargets,
    },
    derived: {
      disposableIncome,
      allocationBase,
      allocationBaseNegative,
      unallocated,
      forecastMargin,
    },
  };
}

export type RecalculateOpenMonthSnapshotInput = {
  budgetMonth: BudgetMonth;
  /** R32, resolved by the caller exactly as at opening. */
  carriedOver: Money;
  fixedEntries: FixedEntry[];
  envelopes: VariableEnvelope[];
  provisions: (Provision & { balance: Money })[];
};

/**
 * R7/R5: when a poste fixe or enveloppe variable change takes effect "ce
 * mois-ci", the already-open month's snapshot must reflect it — a budget
 * recomputed from the versions now active for that month, not just the next
 * one. Pointage status (R27) is preserved per fixed entry; an entry that's
 * newly active this month (a brand-new one, or one un-archived in time)
 * starts "planned" like at opening.
 *
 * A provision newly active this month (just created, or un-archived in time)
 * gets the same treatment — it needs a target to show up in calculations and
 * on the dashboard at all. One already in the snapshot keeps its existing
 * target untouched (R19: a frozen target never changes mid-month, however
 * the provision's balance has moved since opening) — only its presence is
 * re-derived, so one archived effective this month drops out.
 */
export function recalculateOpenMonthSnapshot(input: RecalculateOpenMonthSnapshotInput): {
  fixedEntries: SnapshotFixedEntry[];
  envelopeBudgets: SnapshotEnvelopeBudget[];
  provisionTargets: SnapshotProvisionTarget[];
} {
  const { month, income } = input.budgetMonth;
  const statusByFixedEntryId = new Map(
    input.budgetMonth.fixedEntries.map((entry) => [entry.fixedEntryId, entry.status]),
  );

  const fixedEntries = buildFixedEntriesSnapshot(
    input.fixedEntries,
    month,
    (fixedEntryId) => statusByFixedEntryId.get(fixedEntryId) ?? "planned",
  );

  const disposableIncome = computeDisposableIncome(
    income,
    input.carriedOver,
    fixedEntries.map((entry) => entry.amount),
  );

  const { envelopeBudgets } = buildEnvelopeBudgetsSnapshot(
    input.envelopes,
    month,
    disposableIncome,
  );

  const existingTargetByProvisionId = new Map(
    input.budgetMonth.provisionTargets.map((entry) => [entry.provisionId, entry]),
  );
  const provisionTargets: SnapshotProvisionTarget[] = input.provisions
    .filter((provision) => isProvisionActiveAt(provision, month))
    .map(
      (provision) =>
        existingTargetByProvisionId.get(provision.id) ?? {
          provisionId: provision.id,
          label: provision.label,
          target: computeMonthlyTarget(provision, month, provision.balance),
        },
    );

  return { fixedEntries, envelopeBudgets, provisionTargets };
}
