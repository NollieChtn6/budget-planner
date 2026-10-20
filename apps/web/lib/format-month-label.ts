import type { Month } from "@budget/domain";

const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** "Octobre 2027" — the French month title used throughout "Ce mois-ci". */
export function formatMonthLabel(month: Month): string {
  const name = MONTH_NAMES[month.monthNumber - 1] ?? "";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${month.year}`;
}

/** "d'octobre 2026", "de novembre 2026": the month as it reads after "à partir". */
export function formatFromMonthLabel(month: Month): string {
  const name = formatMonthLabel(month).toLowerCase();
  return /^[aeiouéèêh]/.test(name) ? `d'${name}` : `de ${name}`;
}
