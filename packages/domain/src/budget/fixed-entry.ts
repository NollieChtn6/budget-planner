import type { Money } from "../money";
import { isMonthAfter, isMonthBefore, isSameMonth, type Month, nextMonth } from "../month";

export type FixedEntryType = "charge" | "scheduledSaving";

export type FixedEntryVersion = {
  fixedEntryId: string;
  effectiveFrom: Month;
  amount: Money;
};

export type FixedEntry = {
  id: string;
  label: string;
  type: FixedEntryType;
  versions: FixedEntryVersion[];
  archivedFrom?: Month;
};

/**
 * The version in effect for a given month: the most recent version whose
 * effectiveFrom is at or before that month, or none once the entry has been
 * archived as of that month (R8).
 */
export function activeFixedEntryVersionAt(
  fixedEntry: FixedEntry,
  month: Month,
): FixedEntryVersion | undefined {
  if (fixedEntry.archivedFrom && !isMonthBefore(month, fixedEntry.archivedFrom)) {
    return undefined;
  }
  return fixedEntry.versions
    .filter((version) => !isMonthAfter(version.effectiveFrom, month))
    .reduce<FixedEntryVersion | undefined>((latest, version) => {
      if (!latest || isMonthAfter(version.effectiveFrom, latest.effectiveFrom)) {
        return version;
      }
      return latest;
    }, undefined);
}

export type AddFixedEntryVersionInput = { effectiveFrom: Month; amount: Money };

export type AddFixedEntryVersionFailure = { type: "invalidEffectiveDate"; allowed: Month[] };

export type AddFixedEntryVersionResult =
  | { ok: true; version: FixedEntryVersion }
  | { ok: false; error: AddFixedEntryVersionFailure };

/**
 * R7: effectiveFrom must be the current or the next month. Unlike
 * VariableEnvelope, a fixed entry has no cross-entity constraint (no R12
 * equivalent), so this validates in complete isolation — no need for the
 * full list of the user's other fixed entries.
 */
export function addFixedEntryVersion(
  fixedEntryId: string,
  input: AddFixedEntryVersionInput,
  currentMonth: Month,
): AddFixedEntryVersionResult {
  const allowedDates = [currentMonth, nextMonth(currentMonth)];
  if (!allowedDates.some((date) => isSameMonth(date, input.effectiveFrom))) {
    return { ok: false, error: { type: "invalidEffectiveDate", allowed: allowedDates } };
  }

  return { ok: true, version: { fixedEntryId, ...input } };
}

export type ArchiveFixedEntryInput = { effectiveFrom: Month; hasOperationsInCurrentMonth: boolean };
export type ArchiveFixedEntryFailure = { type: "invalidArchiveDate"; allowed: Month[] };
export type ArchiveFixedEntryResult =
  | { ok: true; fixedEntry: FixedEntry }
  | { ok: false; error: ArchiveFixedEntryFailure };

/**
 * R8: archiving takes effect the current month, unless the entry already
 * has an operation this month, in which case it must wait until next month.
 */
export function archiveFixedEntry(
  fixedEntry: FixedEntry,
  input: ArchiveFixedEntryInput,
  currentMonth: Month,
): ArchiveFixedEntryResult {
  const allowedDates = input.hasOperationsInCurrentMonth
    ? [nextMonth(currentMonth)]
    : [currentMonth, nextMonth(currentMonth)];

  if (!allowedDates.some((date) => isSameMonth(date, input.effectiveFrom))) {
    return { ok: false, error: { type: "invalidArchiveDate", allowed: allowedDates } };
  }

  return { ok: true, fixedEntry: { ...fixedEntry, archivedFrom: input.effectiveFrom } };
}

export type UnarchiveFixedEntryFailure = { type: "notArchivedOrAlreadyEffective" };
export type UnarchiveFixedEntryResult =
  | { ok: true; fixedEntry: FixedEntry }
  | { ok: false; error: UnarchiveFixedEntryFailure };

/** R8: reversible only while the archive date hasn't taken effect yet. */
export function unarchiveFixedEntry(
  fixedEntry: FixedEntry,
  currentMonth: Month,
): UnarchiveFixedEntryResult {
  if (!fixedEntry.archivedFrom || !isMonthAfter(fixedEntry.archivedFrom, currentMonth)) {
    return { ok: false, error: { type: "notArchivedOrAlreadyEffective" } };
  }
  const { archivedFrom: _archivedFrom, ...rest } = fixedEntry;
  return { ok: true, fixedEntry: rest };
}
