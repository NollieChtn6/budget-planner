/**
 * Pécule's amount format (docs/ui/pecule_charte_V_01.html, "Écrire les
 * montants"): fr-FR grouping and decimals, with a true minus sign (U+2212)
 * in place of the ASCII hyphen Intl uses for negative amounts.
 */
export function formatEuros(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }).replace("-", "−");
}
