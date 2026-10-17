import { isMonthBefore, type Month, type VariableEnvelope } from "@budget/domain";

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
