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

function isProvisionActiveAt(provision: Provision, month: Month): boolean {
  return !provision.archivedFrom || isMonthBefore(month, provision.archivedFrom);
}

/**
 * R4: validates the previous month's status, then freezes the snapshot (R5)
 * — fixed entries (R27: status starts at "planned"), envelope budgets
 * (R10-R13), and provision targets (R18, R21) — and computes the month's
 * derived values (R9, R14) from that same snapshot.
 */
export function openMonth(input: OpenMonthInput): OpenMonthResult {
  if (input.previousMonthStatus === "open") {
    return { ok: false, error: { type: "previousMonthNotClosed" } };
  }

  const fixedEntries: SnapshotFixedEntry[] = input.fixedEntries.flatMap((fixedEntry) => {
    const version = activeFixedEntryVersionAt(fixedEntry, input.month);
    if (!version) return [];
    return [
      {
        fixedEntryId: fixedEntry.id,
        label: fixedEntry.label,
        type: fixedEntry.type,
        amount: version.amount,
        status: "planned" as const,
      },
    ];
  });

  const disposableIncome = computeDisposableIncome(
    input.income,
    fixedEntries.map((entry) => entry.amount),
  );

  const activeEnvelopes = input.envelopes.flatMap((envelope) => {
    const version = activeVersionAt(envelope, input.month);
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
        label: envelope.label,
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
      label: envelope.label,
      mode: "percentage",
      value: version.value,
      budget,
    };
  });

  const unallocated = computeUnallocated(
    allocationBase,
    envelopeBudgets.filter((entry) => entry.mode === "percentage").map((entry) => entry.budget),
  );

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
