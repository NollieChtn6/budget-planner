import { dueMonth, type Money, moneyToEuros, type Provision } from "@budget/domain";
import { Meter } from "@/components/meter";
import { ProvisionStatusBadge } from "@/components/provision-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuros } from "@/lib/format-money";
import { formatMonthLabel } from "@/lib/format-month-label";
import { ProvisionQuickActions } from "./provision-quick-actions";

export function ProvisionOperationalCard({
  provision,
  balance,
  target,
  paidThisMonth,
  canAct,
  minDate,
  maxDate,
  defaultDate,
  categories,
  knownPlaces,
  lastUsedCategoryId,
}: {
  provision: Provision;
  balance: Money;
  target: Money | null;
  paidThisMonth: Money;
  canAct: boolean;
  minDate: string;
  maxDate: string;
  defaultDate: string;
  categories: { id: string; label: string }[];
  knownPlaces: string[];
  lastUsedCategoryId: string | null;
}) {
  const pct = provision.target.cents > 0 ? (balance.cents / provision.target.cents) * 100 : 0;

  return (
    <Card className="gap-4 p-5">
      <CardHeader className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="font-heading text-xl">{provision.label}</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {provision.type === "deadline"
                ? `À échéance, ${formatMonthLabel(dueMonth(provision))}`
                : "Réserve, sans échéance"}
            </p>
          </div>
          <ProvisionStatusBadge
            provision={provision}
            target={target}
            balance={balance}
            paidThisMonth={paidThisMonth}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-0">
        <p className="font-heading text-2xl">
          {formatEuros(moneyToEuros(balance))}
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">
            sur {formatEuros(moneyToEuros(provision.target))}
          </span>
        </p>
        <Meter percent={pct} className="bg-accent" />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {provision.type === "reserve" ? (
            <>
              <dt className="text-muted-foreground">Mensualité</dt>
              <dd className="text-right">{formatEuros(moneyToEuros(provision.monthlyAmount))}</dd>
            </>
          ) : null}
          {target ? (
            <>
              <dt className="text-muted-foreground">Cible du mois</dt>
              <dd className="text-right">{formatEuros(moneyToEuros(target))}</dd>
              <dt className="text-muted-foreground">Versé ce mois</dt>
              <dd className="text-right">{formatEuros(moneyToEuros(paidThisMonth))}</dd>
            </>
          ) : null}
        </dl>
        {canAct ? (
          <ProvisionQuickActions
            provisionId={provision.id}
            provisionLabel={provision.label}
            minDate={minDate}
            maxDate={maxDate}
            defaultDate={defaultDate}
            categories={categories}
            knownPlaces={knownPlaces}
            lastUsedCategoryId={lastUsedCategoryId}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
