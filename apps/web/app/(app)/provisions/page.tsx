import {
  findBudgetMonthByMonth,
  findCategoriesByUser,
  findContributionsByUserAndProvision,
  findExpensesByUserAndProvision,
  findKnownPlacesByUser,
  findLastUsedCategoryIdByUser,
  findProvisionsByUser,
  prisma,
} from "@budget/db";
import {
  computeProvisionBalance,
  firstDayOfMonth,
  formatCalendarDate,
  isSameMonth,
  lastDayOfMonth,
  type Money,
  moneyFromCents,
  moneyToEuros,
  monthOfCalendarDate,
  sumMoney,
} from "@budget/domain";
import { resolveActiveMonth } from "@/lib/current-month";
import { formatEuros } from "@/lib/format-money";
import { requireSession } from "@/lib/session";
import { ProvisionOperationalCard } from "./provision-operational-card";

export default async function ProvisionsPage() {
  const session = await requireSession();
  const activeMonth = await resolveActiveMonth(prisma, session.user.id);

  const [provisions, budgetMonth, categories, knownPlaces, lastUsedCategoryId] = await Promise.all([
    findProvisionsByUser(prisma, session.user.id),
    findBudgetMonthByMonth(prisma, session.user.id, activeMonth),
    findCategoriesByUser(prisma, session.user.id),
    findKnownPlacesByUser(prisma, session.user.id),
    findLastUsedCategoryIdByUser(prisma, session.user.id),
  ]);
  const activeCategories = categories
    .filter((category) => !category.archived)
    .map((category) => ({ id: category.id, label: category.label }));

  const ledgers = new Map<string, { balance: Money; paidThisMonth: Money }>();
  await Promise.all(
    provisions.map(async (provision) => {
      const [contributions, expenses] = await Promise.all([
        findContributionsByUserAndProvision(prisma, session.user.id, provision.id),
        findExpensesByUserAndProvision(prisma, session.user.id, provision.id),
      ]);
      const balance = computeProvisionBalance(
        contributions.map((c) => c.amount),
        expenses,
      );
      const paidThisMonth = sumMoney(
        contributions
          .filter((c) => isSameMonth(monthOfCalendarDate(c.date), activeMonth))
          .map((c) => c.amount),
      );
      ledgers.set(provision.id, { balance, paidThisMonth });
    }),
  );

  const totalAvailable = sumMoney(
    provisions
      .filter((p) => p.status !== "closed")
      .map((p) => {
        const balance = ledgers.get(p.id)?.balance ?? moneyFromCents(0);
        return balance.cents > 0 ? balance : moneyFromCents(0);
      }),
  );

  const activeProvisions = provisions
    .filter((p) => p.status !== "closed")
    .sort((a, b) => a.label.localeCompare(b.label));
  const closedProvisions = provisions
    .filter((p) => p.status === "closed")
    .sort((a, b) => a.label.localeCompare(b.label));

  const minDate = formatCalendarDate(firstDayOfMonth(activeMonth));
  const maxDate = formatCalendarDate(lastDayOfMonth(activeMonth));
  const defaultDate = new Date().toISOString().slice(0, 10);

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
        defaultDate={defaultDate}
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

      {activeProvisions.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {activeProvisions.map(card)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Aucune provision pour l'instant. Crée-en une dans les paramètres.
        </p>
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
