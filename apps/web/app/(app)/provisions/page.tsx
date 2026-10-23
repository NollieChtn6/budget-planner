import {
  findBudgetMonthByMonth,
  findCategoriesByUser,
  findContributionsByUserAndMonth,
  findKnownPlacesByUser,
  findLastUsedCategoryIdByUser,
  findProvisionBalancesByUser,
  findProvisionsByUser,
  prisma,
} from "@budget/db";
import {
  dueMonth,
  firstDayOfMonth,
  formatCalendarDate,
  lastDayOfMonth,
  type Money,
  type Month,
  moneyFromCents,
  moneyToEuros,
  sumMoney,
} from "@budget/domain";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { resolveActiveMonth } from "@/lib/current-month";
import { formatEuros } from "@/lib/format-money";
import { formatMonthLabel } from "@/lib/format-month-label";
import { requireSession } from "@/lib/session";
import { ProvisionOperationalCard } from "./provision-operational-card";

function monthIndex(month: Month): number {
  return month.year * 12 + month.monthNumber;
}

export default async function ProvisionsPage() {
  const session = await requireSession();
  const activeMonth = await resolveActiveMonth(prisma, session.user.id);

  const [
    provisions,
    provisionBalances,
    monthContributions,
    budgetMonth,
    categories,
    knownPlaces,
    lastUsedCategoryId,
  ] = await Promise.all([
    findProvisionsByUser(prisma, session.user.id),
    findProvisionBalancesByUser(prisma, session.user.id),
    findContributionsByUserAndMonth(prisma, session.user.id, activeMonth),
    findBudgetMonthByMonth(prisma, session.user.id, activeMonth),
    findCategoriesByUser(prisma, session.user.id),
    findKnownPlacesByUser(prisma, session.user.id),
    findLastUsedCategoryIdByUser(prisma, session.user.id),
  ]);
  const activeCategories = categories
    .filter((category) => !category.archived)
    .map((category) => ({ id: category.id, label: category.label }));

  const ledgers = new Map<string, { balance: Money; paidThisMonth: Money }>();
  for (const provision of provisions) {
    ledgers.set(provision.id, {
      balance: provisionBalances.get(provision.id) ?? moneyFromCents(0),
      paidThisMonth: sumMoney(
        monthContributions.filter((c) => c.provisionId === provision.id).map((c) => c.amount),
      ),
    });
  }

  const totalAvailable = sumMoney(
    provisions
      .filter((p) => p.status !== "closed")
      .map((p) => {
        const balance = ledgers.get(p.id)?.balance ?? moneyFromCents(0);
        return balance.cents > 0 ? balance : moneyFromCents(0);
      }),
  );

  // Late provisions first, then the nearest due month; reserves have no date and come last.
  const urgency = (p: (typeof provisions)[number]) =>
    p.status === "late"
      ? -1
      : p.type === "deadline"
        ? monthIndex(dueMonth(p))
        : Number.MAX_SAFE_INTEGER;
  const activeProvisions = provisions
    .filter((p) => p.status !== "closed")
    .sort((a, b) => urgency(a) - urgency(b) || a.label.localeCompare(b.label));
  const closedProvisions = provisions
    .filter((p) => p.status === "closed")
    .sort((a, b) => a.label.localeCompare(b.label));

  const minDate = formatCalendarDate(firstDayOfMonth(activeMonth));
  const maxDate = formatCalendarDate(lastDayOfMonth(activeMonth));

  function card(provision: (typeof provisions)[number]) {
    const ledger = ledgers.get(provision.id) ?? {
      balance: moneyFromCents(0),
      paidThisMonth: moneyFromCents(0),
    };
    const target =
      budgetMonth?.provisionTargets.find((entry) => entry.provisionId === provision.id)?.target ??
      null;
    return (
      <ProvisionOperationalCard
        key={provision.id}
        provision={provision}
        balance={ledger.balance}
        target={target}
        paidThisMonth={ledger.paidThisMonth}
        canAct={budgetMonth?.status === "open" && provision.status !== "closed"}
        minDate={minDate}
        maxDate={maxDate}
        activeMonth={activeMonth}
        categories={activeCategories}
        knownPlaces={knownPlaces}
        lastUsedCategoryId={lastUsedCategoryId}
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="font-heading text-[34px] leading-tight">Provisions</h1>
        <p className="mt-1.5 text-muted-foreground">
          L'argent mis de côté pour les dépenses prévues. Total disponible :{" "}
          <strong className="font-heading text-foreground">
            {formatEuros(moneyToEuros(totalAvailable))}
          </strong>
          .
        </p>
      </div>

      {budgetMonth?.status === "closed" ? (
        <p className="text-sm text-muted-foreground">
          {formatMonthLabel(activeMonth)} est clôturé : les versements et les dépenses sont
          verrouillés.
        </p>
      ) : !budgetMonth ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {formatMonthLabel(activeMonth)} n'est pas encore ouvert : ouvre-le pour verser ou
            dépenser.
          </p>
          <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Ouvrir le mois
          </Link>
        </div>
      ) : null}

      {activeProvisions.length > 0 ? (
        <section aria-labelledby="provisions-en-cours" className="flex flex-col gap-4">
          <h2 id="provisions-en-cours" className="sr-only">
            En cours
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {activeProvisions.map(card)}
          </div>
        </section>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            Aucune provision pour l'instant. Une provision met de côté chaque mois pour une dépense
            prévue.
          </p>
          <Link
            href="/settings/provisions"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Créer une provision
          </Link>
        </div>
      )}

      {closedProvisions.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-xl">Clôturées</h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {closedProvisions.map(card)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
