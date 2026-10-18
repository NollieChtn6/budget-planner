import {
  activeVersionAt,
  compareMonths,
  isMonthBefore,
  type Month,
  type VariableEnvelope,
} from "@budget/domain";

/** R8: an envelope is no longer proposed for new operations once its archive date has taken effect. */
export function isEnvelopeActive(envelope: VariableEnvelope, currentMonth: Month): boolean {
  return !envelope.archivedFrom || isMonthBefore(currentMonth, envelope.archivedFrom);
}

export function filterActiveEnvelopes(
  envelopes: VariableEnvelope[],
  currentMonth: Month,
): VariableEnvelope[] {
  return envelopes.filter((envelope) => isEnvelopeActive(envelope, currentMonth));
}

/**
 * The label's versioned like the rest of the envelope's parameters (R7): the
 * one active for this month, or the earliest version as a fallback for a
 * month before any version has taken effect yet.
 */
export function envelopeLabelAt(envelope: VariableEnvelope, month: Month): string {
  const active = activeVersionAt(envelope, month);
  if (active) return active.label;
  return (
    [...envelope.versions].sort((a, b) => compareMonths(b.effectiveFrom, a.effectiveFrom))[0]
      ?.label ?? ""
  );
}
