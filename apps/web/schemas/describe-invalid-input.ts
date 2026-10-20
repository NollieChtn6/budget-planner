import type { ZodError } from "zod";

const FIELD_MESSAGES: Record<string, string> = {
  date: "Choisis une date valide.",
  label: "Saisis un libellé.",
  categoryId: "Choisis une catégorie.",
  provisionId: "Choisis une provision.",
  target: "Choisis une enveloppe ou une provision.",
  color: "Choisis une couleur.",
  effectiveFrom: "Choisis le mois à partir duquel ça s'applique.",
  startMonth: "Choisis un mois de départ valide.",
  newDueMonth: "Choisis une échéance valide.",
  durationMonths: "Saisis une durée d'au moins 1 mois, en nombre entier.",
  percentage: "Saisis un pourcentage entier entre 0 et 100.",
  targetEuros: "Saisis un objectif supérieur à 0 €.",
  monthlyAmountEuros: "Saisis un montant mensuel supérieur à 0 €.",
};

const AMOUNT_FIELDS = new Set(["amountEuros", "incomeEuros"]);

/**
 * The first problem of a failed form, worded for the person who typed it. Zod's own messages are
 * generic (and English when the schema gives none), so the wording is chosen by field.
 */
export function describeInvalidInput(error: ZodError): string {
  const issue = error.issues[0];
  const field = issue?.path.find((segment): segment is string => typeof segment === "string");
  if (!issue || !field) return "Vérifie les champs du formulaire.";

  if (AMOUNT_FIELDS.has(field)) {
    return issue.code === "too_small"
      ? "Le montant ne peut pas être négatif."
      : "Saisis un montant valide, par exemple 12,50.";
  }
  return FIELD_MESSAGES[field] ?? "Vérifie les champs du formulaire.";
}
