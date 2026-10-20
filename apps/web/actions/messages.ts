/** User-facing wording shared by the server actions: one sentence per situation, in the tutoiement. */

export const INVALID_AMOUNT = "Le montant ne peut pas avoir plus de 2 décimales.";
export const INVALID_DATE = "Cette date n'est pas valide.";
export const MONTH_NOT_OPEN = "Le mois n'est pas ouvert. Ouvre-le depuis « Ce mois-ci ».";
/** Only reachable with a tampered or stale form: nothing the person typed is at fault. */
export const INVALID_REQUEST =
  "Cette action n'a pas pu être traitée. Recharge la page puis réessaie.";
export const TARGET_REQUIRED = "Choisis une enveloppe ou une provision.";

/** Same wording whether the thing was deleted elsewhere or never belonged to this account. */
export function notFound(noun: string): string {
  return `${noun} introuvable. Recharge la page puis réessaie.`;
}
