import {
  type FixedEntry,
  type FixedEntryVersion,
  moneyFromCents,
  moneyToCents,
} from "@budget/domain";
import type {
  FixedEntry as PrismaFixedEntry,
  FixedEntryVersion as PrismaFixedEntryVersion,
} from "@prisma/client";
import { dateToMonth, monthToDate } from "./month";

export function toDomainFixedEntryVersion(row: PrismaFixedEntryVersion): FixedEntryVersion {
  return {
    fixedEntryId: row.fixedEntryId,
    effectiveFrom: dateToMonth(row.effectiveFrom),
    label: row.label,
    amount: moneyFromCents(row.amountCents),
  };
}

export function toDomainFixedEntry(
  row: PrismaFixedEntry & { versions: PrismaFixedEntryVersion[] },
): FixedEntry {
  return {
    id: row.id,
    type: row.type,
    versions: row.versions.map(toDomainFixedEntryVersion),
    ...(row.archivedFrom ? { archivedFrom: dateToMonth(row.archivedFrom) } : {}),
  };
}

export function toPrismaFixedEntryVersionData(version: FixedEntryVersion): {
  effectiveFrom: Date;
  label: string;
  amountCents: number;
} {
  return {
    effectiveFrom: monthToDate(version.effectiveFrom),
    label: version.label,
    amountCents: moneyToCents(version.amount),
  };
}
