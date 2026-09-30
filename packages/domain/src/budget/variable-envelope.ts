import type { Money } from "../money";
import {
  compareMonths,
  formatMonth,
  isMonthAfter,
  isMonthBefore,
  isSameMonth,
  type Month,
  nextMonth,
} from "../month";

export type VariableEnvelopeVersion = { envelopeId: string; effectiveFrom: Month } & (
  | { mode: "amount"; value: Money }
  | { mode: "percentage"; value: number }
);

export type VariableEnvelope = {
  id: string;
  label: string;
  versions: VariableEnvelopeVersion[];
  archivedFrom?: Month;
};

/**
 * The version in effect for a given month: the most recent version whose
 * effectiveFrom is at or before that month (docs/domain/model.md), or none
 * once the envelope has been archived as of that month (R8).
 */
export function activeVersionAt(
  envelope: VariableEnvelope,
  month: Month,
): VariableEnvelopeVersion | undefined {
  if (envelope.archivedFrom && !isMonthBefore(month, envelope.archivedFrom)) {
    return undefined;
  }
  return envelope.versions
    .filter((version) => !isMonthAfter(version.effectiveFrom, month))
    .reduce<VariableEnvelopeVersion | undefined>((latest, version) => {
      if (!latest || isMonthAfter(version.effectiveFrom, latest.effectiveFrom)) {
        return version;
      }
      return latest;
    }, undefined);
}

export type AddVersionInput = { effectiveFrom: Month } & (
  | { mode: "amount"; value: Money }
  | { mode: "percentage"; value: number }
);

export type AddVersionFailure =
  | { type: "invalidEffectiveDate"; allowed: Month[] }
  | { type: "percentageCapExceeded"; violations: { month: Month; total: number }[] };

export type AddVersionResult =
  | { ok: true; version: VariableEnvelopeVersion }
  | { ok: false; error: AddVersionFailure };

function upsertVersion(
  versions: VariableEnvelopeVersion[],
  version: VariableEnvelopeVersion,
): VariableEnvelopeVersion[] {
  return [...versions.filter((v) => !isSameMonth(v.effectiveFrom, version.effectiveFrom)), version];
}

function collectCheckpointMonths(
  envelopes: VariableEnvelope[],
  from: Month,
  upperBound: Month | undefined,
): Month[] {
  const checkpoints = new Map<string, Month>();
  checkpoints.set(formatMonth(from), from);
  for (const envelope of envelopes) {
    for (const version of envelope.versions) {
      if (isMonthBefore(version.effectiveFrom, from)) continue;
      if (upperBound && !isMonthBefore(version.effectiveFrom, upperBound)) continue;
      checkpoints.set(formatMonth(version.effectiveFrom), version.effectiveFrom);
    }
  }
  return [...checkpoints.values()].sort(compareMonths);
}

function percentageSumAt(envelopes: VariableEnvelope[], month: Month): number {
  return envelopes.reduce((total, envelope) => {
    const active = activeVersionAt(envelope, month);
    return active?.mode === "percentage" ? total + active.value : total;
  }, 0);
}

/**
 * R7: effectiveFrom must be the current or the next month.
 * R12: a percentage-mode version must not push, at any month for which it
 * would be active, the sum of active percentage envelopes past 100.
 */
export function addVersion(
  envelopeId: string,
  allEnvelopes: VariableEnvelope[],
  input: AddVersionInput,
  currentMonth: Month,
): AddVersionResult {
  const target = allEnvelopes.find((envelope) => envelope.id === envelopeId);
  if (!target) {
    throw new Error(`Unknown envelope id: ${envelopeId}`);
  }

  const allowedDates = [currentMonth, nextMonth(currentMonth)];
  if (!allowedDates.some((date) => isSameMonth(date, input.effectiveFrom))) {
    return { ok: false, error: { type: "invalidEffectiveDate", allowed: allowedDates } };
  }

  const version: VariableEnvelopeVersion = { envelopeId, ...input };

  if (input.mode === "percentage") {
    const upperBound = target.versions
      .filter((v) => isMonthAfter(v.effectiveFrom, input.effectiveFrom))
      .sort((a, b) => compareMonths(a.effectiveFrom, b.effectiveFrom))[0]?.effectiveFrom;

    const hypotheticalEnvelopes = allEnvelopes.map((envelope) =>
      envelope.id === envelopeId
        ? { ...envelope, versions: upsertVersion(envelope.versions, version) }
        : envelope,
    );

    const violations = collectCheckpointMonths(
      hypotheticalEnvelopes,
      input.effectiveFrom,
      upperBound,
    )
      .map((month) => ({ month, total: percentageSumAt(hypotheticalEnvelopes, month) }))
      .filter((violation) => violation.total > 100);

    if (violations.length > 0) {
      return { ok: false, error: { type: "percentageCapExceeded", violations } };
    }
  }

  return { ok: true, version };
}

export type ArchiveInput = { effectiveFrom: Month; hasOperationsInCurrentMonth: boolean };
export type ArchiveFailure = { type: "invalidArchiveDate"; allowed: Month[] };
export type ArchiveResult =
  | { ok: true; envelope: VariableEnvelope }
  | { ok: false; error: ArchiveFailure };

/**
 * R8: archiving takes effect the current month, unless the envelope already
 * has an operation this month, in which case it must wait until next month.
 */
export function archive(
  envelope: VariableEnvelope,
  input: ArchiveInput,
  currentMonth: Month,
): ArchiveResult {
  const allowedDates = input.hasOperationsInCurrentMonth
    ? [nextMonth(currentMonth)]
    : [currentMonth, nextMonth(currentMonth)];

  if (!allowedDates.some((date) => isSameMonth(date, input.effectiveFrom))) {
    return { ok: false, error: { type: "invalidArchiveDate", allowed: allowedDates } };
  }

  return { ok: true, envelope: { ...envelope, archivedFrom: input.effectiveFrom } };
}

export type UnarchiveFailure = { type: "notArchivedOrAlreadyEffective" };
export type UnarchiveResult =
  | { ok: true; envelope: VariableEnvelope }
  | { ok: false; error: UnarchiveFailure };

/** R8: reversible only while the archive date hasn't taken effect yet. */
export function unarchive(envelope: VariableEnvelope, currentMonth: Month): UnarchiveResult {
  if (!envelope.archivedFrom || !isMonthAfter(envelope.archivedFrom, currentMonth)) {
    return { ok: false, error: { type: "notArchivedOrAlreadyEffective" } };
  }
  const { archivedFrom: _archivedFrom, ...rest } = envelope;
  return { ok: true, envelope: rest };
}
