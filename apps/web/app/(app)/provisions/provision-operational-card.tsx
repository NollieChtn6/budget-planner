import {
  dueMonth,
  type Money,
  type Month,
  moneyFromCents,
  moneyToEuros,
  type Provision,
  subtractMoney,
} from "@budget/domain";
import { Meter } from "@/components/meter";
import { ProvisionStatusBadge } from "@/components/provision-status-badge";
import { Card } from "@/components/ui/card";
import { formatEuros } from "@/lib/format-money";
import { formatMonthLabel } from "@/lib/format-month-label";
import { describeTimeline } from "@/lib/provision-timeline";
import { ProvisionQuickActions } from "./provision-quick-actions";

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="font-heading text-lg tabular-nums">{children}</dd>
    </div>
  );
}

export function ProvisionOperationalCard({
  provision,
  activeMonth,
  balance,
  target,
  paidThisMonth,
  canAct,
  minDate,
  maxDate,
  categories,
  knownPlaces,
  lastUsedCategoryId,
}: {
  provision: Provision;
  activeMonth: Month;
  balance: Money;
  target: Money | null;
  paidThisMonth: Money;
  canAct: boolean;
  minDate: string;
  maxDate: string;
  categories: { id: string; label: string }[];
  knownPlaces: string[];
  lastUsedCategoryId: string | null;
}) {
  const goal = provision.target;
  const pct = goal.cents > 0 ? (balance.cents / goal.cents) * 100 : 0;
  // Where the fill should be once this month's target is paid: the target already holds the plan.
  const expected =
    target && goal.cents > 0 ? subtractMoney(balance, paidThisMonth).cents + target.cents : null;
  const expectedPct = expected !== null && goal.cents > 0 ? (expected / goal.cents) * 100 : null;
  const isClosed = provision.status === "closed";

  const kind =
    provision.type === "deadline"
      ? `À échéance en ${formatMonthLabel(dueMonth(provision)).toLowerCase()}${
          isClosed ? "" : ` · ${describeTimeline(activeMonth, dueMonth(provision))}`
        }`
      : "Réserve, sans échéance";

  return (
    <Card className="gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0">
          <h3 className="font-heading text-xl leading-snug font-medium">{provision.label}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{kind}</p>
        </div>
        <ProvisionStatusBadge
          provision={provision}
          target={target}
          balance={balance}
          paidThisMonth={paidThisMonth}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="font-heading text-2xl tabular-nums">
          {formatEuros(moneyToEuros(balance))}
          <span className="ml-1.5 font-sans text-sm font-normal text-muted-foreground">
            sur {formatEuros(moneyToEuros(goal))}
          </span>
        </p>
        <Meter
          percent={pct}
          marker={expectedPct ?? undefined}
          label={`Progression de ${provision.label}`}
          valueText={`${formatEuros(moneyToEuros(balance))} sur ${formatEuros(moneyToEuros(goal))}`}
          className="bg-accent"
        />
        {expected !== null ? (
          <p className="text-[13px] text-muted-foreground">
            Le trait marque où tu devrais en être à la fin du mois :{" "}
            {formatEuros(moneyToEuros(moneyFromCents(expected)))}.
          </p>
        ) : null}
      </div>

      {target || provision.type === "reserve" ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          {target ? (
            <>
              <Figure label="Cible du mois">{formatEuros(moneyToEuros(target))}</Figure>
              <Figure label="Versé ce mois">{formatEuros(moneyToEuros(paidThisMonth))}</Figure>
            </>
          ) : null}
          {provision.type === "reserve" ? (
            <Figure label="Mensualité">{formatEuros(moneyToEuros(provision.monthlyAmount))}</Figure>
          ) : null}
        </dl>
      ) : null}

      {canAct ? (
        <ProvisionQuickActions
          provisionId={provision.id}
          provisionLabel={provision.label}
          minDate={minDate}
          maxDate={maxDate}
          categories={categories}
          knownPlaces={knownPlaces}
          lastUsedCategoryId={lastUsedCategoryId}
        />
      ) : null}
    </Card>
  );
}
