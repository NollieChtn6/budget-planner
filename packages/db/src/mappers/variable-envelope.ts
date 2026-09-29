import {
  formatMonth,
  type Month,
  moneyFromCents,
  moneyToCents,
  parseMonth,
  type VariableEnvelope,
  type VariableEnvelopeVersion,
} from "@budget/domain";
import type {
  VariableEnvelope as PrismaVariableEnvelope,
  VariableEnvelopeVersion as PrismaVariableEnvelopeVersion,
} from "@prisma/client";

/** First-of-month UTC Date, the Prisma-side representation of a Month (ADR-0007). */
export function monthToDate(month: Month): Date {
  return new Date(`${formatMonth(month)}-01T00:00:00.000Z`);
}

export function dateToMonth(date: Date): Month {
  return parseMonth(date.toISOString().slice(0, 7));
}

export function toDomainVariableEnvelopeVersion(
  row: PrismaVariableEnvelopeVersion,
): VariableEnvelopeVersion {
  const base = { envelopeId: row.envelopeId, effectiveFrom: dateToMonth(row.effectiveFrom) };
  if (row.mode === "amount") {
    // The mode/value-column pairing is enforced by a DB CHECK constraint (see the migration).
    return { ...base, mode: "amount", value: moneyFromCents(row.amountCents as number) };
  }
  return { ...base, mode: "percentage", value: row.percentage as number };
}

export function toDomainVariableEnvelope(
  row: PrismaVariableEnvelope & { versions: PrismaVariableEnvelopeVersion[] },
): VariableEnvelope {
  return {
    id: row.id,
    label: row.label,
    versions: row.versions.map(toDomainVariableEnvelopeVersion),
    ...(row.archivedFrom ? { archivedFrom: dateToMonth(row.archivedFrom) } : {}),
  };
}

export function toPrismaVersionData(version: VariableEnvelopeVersion): {
  effectiveFrom: Date;
  mode: "amount" | "percentage";
  amountCents: number | null;
  percentage: number | null;
} {
  const effectiveFrom = monthToDate(version.effectiveFrom);
  if (version.mode === "amount") {
    return {
      effectiveFrom,
      mode: "amount",
      amountCents: moneyToCents(version.value),
      percentage: null,
    };
  }
  return { effectiveFrom, mode: "percentage", amountCents: null, percentage: version.value };
}
