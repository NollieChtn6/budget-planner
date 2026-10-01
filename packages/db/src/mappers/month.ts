import {
  type BudgetMonth,
  formatMonth,
  type Month,
  moneyFromCents,
  moneyToCents,
  parseMonth,
  type SnapshotEnvelopeBudget,
  type SnapshotFixedEntry,
  type SnapshotProvisionTarget,
} from "@budget/domain";
import type {
  BudgetMonth as PrismaBudgetMonth,
  SnapshotEnvelopeBudget as PrismaSnapshotEnvelopeBudget,
  SnapshotFixedEntry as PrismaSnapshotFixedEntry,
  SnapshotProvisionTarget as PrismaSnapshotProvisionTarget,
} from "@prisma/client";

/** First-of-month UTC Date, the Prisma-side representation of a Month (ADR-0007). */
export function monthToDate(month: Month): Date {
  return new Date(`${formatMonth(month)}-01T00:00:00.000Z`);
}

export function dateToMonth(date: Date): Month {
  return parseMonth(date.toISOString().slice(0, 7));
}

export function toDomainSnapshotFixedEntry(row: PrismaSnapshotFixedEntry): SnapshotFixedEntry {
  return {
    fixedEntryId: row.fixedEntryId,
    label: row.label,
    type: row.type,
    amount: moneyFromCents(row.amountCents),
    status: row.status,
  };
}

export function toPrismaSnapshotFixedEntryData(entry: SnapshotFixedEntry): {
  fixedEntryId: string;
  label: string;
  type: SnapshotFixedEntry["type"];
  amountCents: number;
  status: SnapshotFixedEntry["status"];
} {
  return {
    fixedEntryId: entry.fixedEntryId,
    label: entry.label,
    type: entry.type,
    amountCents: moneyToCents(entry.amount),
    status: entry.status,
  };
}

export function toDomainSnapshotEnvelopeBudget(
  row: PrismaSnapshotEnvelopeBudget,
): SnapshotEnvelopeBudget {
  const base = {
    envelopeId: row.envelopeId,
    label: row.label,
    budget: moneyFromCents(row.budgetCents),
  };
  if (row.mode === "amount") {
    // The mode/value-column pairing is enforced by a DB CHECK constraint (see the migration).
    return { ...base, mode: "amount", value: moneyFromCents(row.amountCents as number) };
  }
  return { ...base, mode: "percentage", value: row.percentage as number };
}

export function toPrismaSnapshotEnvelopeBudgetData(entry: SnapshotEnvelopeBudget): {
  envelopeId: string;
  label: string;
  mode: "amount" | "percentage";
  amountCents: number | null;
  percentage: number | null;
  budgetCents: number;
} {
  const base = {
    envelopeId: entry.envelopeId,
    label: entry.label,
    budgetCents: moneyToCents(entry.budget),
  };
  if (entry.mode === "amount") {
    return { ...base, mode: "amount", amountCents: moneyToCents(entry.value), percentage: null };
  }
  return { ...base, mode: "percentage", amountCents: null, percentage: entry.value };
}

export function toDomainSnapshotProvisionTarget(
  row: PrismaSnapshotProvisionTarget,
): SnapshotProvisionTarget {
  return {
    provisionId: row.provisionId,
    label: row.label,
    target: moneyFromCents(row.targetCents),
  };
}

export function toPrismaSnapshotProvisionTargetData(entry: SnapshotProvisionTarget): {
  provisionId: string;
  label: string;
  targetCents: number;
} {
  return {
    provisionId: entry.provisionId,
    label: entry.label,
    targetCents: moneyToCents(entry.target),
  };
}

export function toDomainBudgetMonth(
  row: PrismaBudgetMonth & {
    fixedEntries: PrismaSnapshotFixedEntry[];
    envelopeBudgets: PrismaSnapshotEnvelopeBudget[];
    provisionTargets: PrismaSnapshotProvisionTarget[];
  },
): BudgetMonth {
  return {
    month: dateToMonth(row.month),
    status: row.status,
    income: moneyFromCents(row.incomeCents),
    fixedEntries: row.fixedEntries.map(toDomainSnapshotFixedEntry),
    envelopeBudgets: row.envelopeBudgets.map(toDomainSnapshotEnvelopeBudget),
    provisionTargets: row.provisionTargets.map(toDomainSnapshotProvisionTarget),
  };
}
