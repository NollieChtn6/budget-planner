import type { Month } from "@budget/domain";

/** Whole months from `from` to `to`; negative when `to` is earlier. */
export function monthsUntil(from: Month, to: Month): number {
  return (to.year - from.year) * 12 + (to.monthNumber - from.monthNumber);
}

/**
 * Where a deadline provision stands in time, relative to the active month: the due month is the
 * last one a versement can go in, so it still counts.
 */
export function describeTimeline(activeMonth: Month, dueMonth: Month): string {
  const months = monthsUntil(activeMonth, dueMonth);
  if (months < 0) {
    const late = -months;
    return `échéance dépassée depuis ${late} mois`;
  }
  if (months === 0) return "dernier mois pour verser";
  return `${months + 1} mois restants`;
}
