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
    amount: moneyFromCents(row.amountCents),
  };
}

export function toDomainFixedEntry(
  row: PrismaFixedEntry & { versions: PrismaFixedEntryVersion[] },
): FixedEntry {
  return {
    id: row.id,
    label: row.label,
    type: row.type,
    versions: row.versions.map(toDomainFixedEntryVersion),
    ...(row.archivedFrom ? { archivedFrom: dateToMonth(row.archivedFrom) } : {}),
  };
}

export function toPrismaFixedEntryVersionData(version: FixedEntryVersion): {
  effectiveFrom: Date;
  amountCents: number;
} {
  return {
    effectiveFrom: monthToDate(version.effectiveFrom),
    amountCents: moneyToCents(version.amount),
  };
}
