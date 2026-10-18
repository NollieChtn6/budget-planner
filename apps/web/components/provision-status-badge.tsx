import { type Money, moneyToEuros, type Provision, subtractMoney } from "@budget/domain";
import { Badge } from "@/components/ui/badge";
import { formatEuros } from "@/lib/format-money";
import { formatMonthLabel } from "@/lib/format-month-label";

/** R23's statuses (docs/ui/pecule_maquettes_v_02.html, provState): closed, late, goal reached, not due yet, ahead, or what's left this month. */
export function ProvisionStatusBadge({
  provision,
  target,
  balance,
  paidThisMonth,
}: {
  provision: Provision;
  target: Money | null;
  balance: Money;
  paidThisMonth: Money;
}) {
  if (provision.status === "closed") {
    return <Badge>Clôturée</Badge>;
  }
  if (provision.status === "late") {
    return <Badge variant="negative">En retard</Badge>;
  }
  if (provision.target.cents > 0 && balance.cents >= provision.target.cents) {
    return <Badge variant="positive">Objectif atteint</Badge>;
  }
  if (!target) {
    return provision.type === "deadline" ? (
      <Badge>Démarre en {formatMonthLabel(provision.startMonth)}</Badge>
    ) : null;
  }
  const advance = subtractMoney(paidThisMonth, target);
  if (advance.cents > 0) {
    return <Badge variant="positive">Avance +{formatEuros(moneyToEuros(advance))}</Badge>;
  }
  if (advance.cents === 0 && target.cents > 0) {
    return <Badge variant="positive">Cible du mois atteinte</Badge>;
  }
  return (
    <Badge>Reste {formatEuros(moneyToEuros(subtractMoney(target, paidThisMonth)))} ce mois</Badge>
  );
}
