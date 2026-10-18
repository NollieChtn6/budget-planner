import {
  findBudgetMonthByMonth,
  findCategoriesByUser,
  findContributionsByUserAndProvision,
  findExpensesByUserAndMonth,
  findExpensesByUserAndProvision,
  findFixedEntriesByUser,
  findKnownPlacesByUser,
  findLastUsedCategoryIdByUser,
  findLeftoverAllocationsByUserAndMonth,
  findProvisionsByUser,
  findVariableEnvelopesByUser,
  prisma,
} from "@budget/db";
import {
  activeFixedEntryVersionAt,
  activeVersionAt,
  addMoney,
  type ConsumptionLevel,
  type Contribution,
  compareCalendarDates,
  computeAllocationBase,
  computeCarriedOver,
  computeConsumptionLevel,
  computeDisposableIncome,
  computeEnvelopeBonus,
  computeForecastMargin,
  computeLeftover,
  computeProvisionBalance,
  computeRemaining,
  computeSavingsFundedAmount,
  computeSpent,
  type Expense,
  type FixedEntryType,
  firstDayOfMonth,
  formatCalendarDate,
  isMonthAfter,
  isSameMonth,
  lastDayOfMonth,
  type Money,
  moneyFromCents,
  moneyToEuros,
  monthOfCalendarDate,
  nextMonth,
  type Provision,
  previousMonth,
  subtractMoney,
  sumMoney,
} from "@budget/domain";
import Link from "next/link";
import { Meter } from "@/components/meter";
import { ProvisionStatusBadge } from "@/components/provision-status-badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { envelopeLabelAt } from "@/lib/active-envelopes";
import {
  CONSUMPTION_LEVEL_BG_CLASSES,
  CONSUMPTION_LEVEL_LABELS,
  CONSUMPTION_LEVEL_TEXT_CLASSES,
} from "@/lib/alert-level";
import { resolveActiveMonth, resolveCurrentMonth } from "@/lib/current-month";
import { formatEuros } from "@/lib/format-money";
import { formatMonthLabel } from "@/lib/format-month-label";
import { requireSession } from "@/lib/session";
import { AddOperationDialogs } from "./_components/add-operation-dialogs";
import { CloseMonthTeaser } from "./_components/close-month-teaser";
import { OpenMonthForm } from "./_components/open-month-form";
import { PointageCheckbox } from "./_components/pointage-checkbox";
import { ReopenMonthForm } from "./_components/reopen-month-form";

const FIXED_ENTRY_TYPE_LABELS: Record<FixedEntryType, string> = {
  charge: "Charges",
  scheduledSaving: "Épargne programmée",
};

export default async function HomePage() {
  const session = await requireSession();
  const activeMonth = await resolveActiveMonth(prisma, session.user.id);
  const budgetMonth = await findBudgetMonthByMonth(prisma, session.user.id, activeMonth);

  if (!budgetMonth) {
    const [previousMonthRow, fixedEntries] = await Promise.all([
      findBudgetMonthByMonth(prisma, session.user.id, previousMonth(activeMonth)),
      findFixedEntriesByUser(prisma, session.user.id),
    ]);
    const canOpen = !previousMonthRow || previousMonthRow.status === "closed";
    const totalFixed = sumMoney(
      fixedEntries.flatMap((fixedEntry) => {
        const version = activeFixedEntryVersionAt(fixedEntry, activeMonth);
        return version ? [version.amount] : [];
      }),
    );

    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-heading text-[34px] leading-tight">
            {formatMonthLabel(activeMonth)}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {canOpen
              ? `${previousMonthRow ? `${formatMonthLabel(previousMonth(activeMonth))} est clôturé. ` : ""}Ce mois n'est pas encore ouvert.`
              : "Le mois précédent doit d'abord être clôturé."}
          </p>
        </div>
        {canOpen ? <OpenMonthForm totalFixedEuros={moneyToEuros(totalFixed)} /> : null}
      </div>
    );
  }

  const [previousMonthAllocations, allEnvelopes, nextMonthRow] = await Promise.all([
    findLeftoverAllocationsByUserAndMonth(prisma, session.user.id, previousMonth(activeMonth)),
    findVariableEnvelopesByUser(prisma, session.user.id),
    findBudgetMonthByMonth(prisma, session.user.id, nextMonth(activeMonth)),
  ]);
  const carriedOver = computeCarriedOver(previousMonthAllocations);
  const envelopeBonuses = new Map(
    budgetMonth.envelopeBudgets.map((entry) => [
      entry.envelopeId,
      computeEnvelopeBonus(previousMonthAllocations, entry.envelopeId),
    ]),
  );
  const nextMonthEnvelopes = allEnvelopes.flatMap((envelope) => {
    const version = activeVersionAt(envelope, nextMonth(activeMonth));
    return version ? [{ id: envelope.id, label: version.label }] : [];
  });
  const nextMonthIsOpen = nextMonthRow?.status === "open";

  const fixedEntryAmounts = budgetMonth.fixedEntries.map((entry) => entry.amount);
  const totalFixed = sumMoney(fixedEntryAmounts);
  const disposableIncome = computeDisposableIncome(
    budgetMonth.income,
    carriedOver,
    fixedEntryAmounts,
  );

  const amountModeValues = budgetMonth.envelopeBudgets
    .filter((entry) => entry.mode === "amount")
    .map((entry) => entry.value);
  const allocationBase = computeAllocationBase(disposableIncome, amountModeValues);

  const forecastMargin = computeForecastMargin(
    disposableIncome,
    budgetMonth.envelopeBudgets.map((entry) => entry.budget),
    budgetMonth.provisionTargets.map((entry) => entry.target),
  );

  const [expenses, categories, provisions, knownPlaces, lastUsedCategoryId] = await Promise.all([
    findExpensesByUserAndMonth(prisma, session.user.id, activeMonth),
    findCategoriesByUser(prisma, session.user.id),
    findProvisionsByUser(prisma, session.user.id),
    findKnownPlacesByUser(prisma, session.user.id),
    findLastUsedCategoryIdByUser(prisma, session.user.id),
  ]);
  const activeCategories = categories.filter((category) => !category.archived);
  const provisionsById = new Map<string, Provision>(provisions.map((p) => [p.id, p]));
  const provisionLabels = new Map(
    budgetMonth.provisionTargets.map((entry) => [entry.provisionId, entry.label]),
  );
  // Versement/dépense targets aren't limited to this month's snapshotted targets (R7's
  // recalculation explicitly leaves provisionTargets untouched) — any non-closed provision
  // can receive a payment or an expense, as in the maquette's opForm provOpts.
  const activeProvisions = provisions.filter((provision) => provision.status !== "closed");

  const envelopeConsumption = new Map<
    string,
    { spent: Money; remaining: Money; level: ConsumptionLevel }
  >();
  for (const entry of budgetMonth.envelopeBudgets) {
    const spent = computeSpent(
      expenses
        .filter(
          (expense): expense is Expense & { source: { type: "envelope"; envelopeId: string } } =>
            expense.source.type === "envelope" && expense.source.envelopeId === entry.envelopeId,
        )
        .map((expense) => expense.amount),
    );
    const effectiveBudget = addMoney(
      entry.budget,
      envelopeBonuses.get(entry.envelopeId) ?? moneyFromCents(0),
    );
    envelopeConsumption.set(entry.envelopeId, {
      spent,
      remaining: computeRemaining(effectiveBudget, spent),
      level: computeConsumptionLevel(effectiveBudget, spent),
    });
  }

  const provisionLedger = new Map<string, { balance: Money; paidThisMonth: Money }>();
  const contributionsThisMonth: Contribution[] = [];
  const provisionLedgerData = await Promise.all(
    budgetMonth.provisionTargets.map(async (entry) => {
      const [contributions, provisionExpenses] = await Promise.all([
        findContributionsByUserAndProvision(prisma, session.user.id, entry.provisionId),
        findExpensesByUserAndProvision(prisma, session.user.id, entry.provisionId),
      ]);
      return { provisionId: entry.provisionId, contributions, provisionExpenses };
    }),
  );
  for (const { provisionId, contributions, provisionExpenses } of provisionLedgerData) {
    const balance = computeProvisionBalance(
      contributions.map((c) => c.amount),
      provisionExpenses,
    );
    const thisMonth = contributions.filter((c) =>
      isSameMonth(monthOfCalendarDate(c.date), activeMonth),
    );
    contributionsThisMonth.push(...thisMonth);
    const paidThisMonth = sumMoney(thisMonth.map((c) => c.amount));
    provisionLedger.set(provisionId, { balance, paidThisMonth });
  }
  contributionsThisMonth.sort((a, b) => compareCalendarDates(a.date, b.date));

  const envelopeRemainders = budgetMonth.envelopeBudgets.map((entry) => ({
    label: entry.label,
    remaining: moneyToEuros(envelopeConsumption.get(entry.envelopeId)?.remaining ?? entry.budget),
  }));
  const leftover = computeLeftover(
    budgetMonth.envelopeBudgets.map(
      (entry) => envelopeConsumption.get(entry.envelopeId)?.remaining ?? entry.budget,
    ),
  );
  const savingsFunded = computeSavingsFundedAmount(leftover);

  const existingAllocations = await findLeftoverAllocationsByUserAndMonth(
    prisma,
    session.user.id,
    activeMonth,
  );
  const previouslyAllocated = sumMoney(existingAllocations.map((a) => a.amount));
  const allocatable = subtractMoney(leftover, previouslyAllocated);
  const envelopeLabelsForAllocations = new Map(
    allEnvelopes.map((envelope) => [envelope.id, envelopeLabelAt(envelope, activeMonth)]),
  );
  function allocationLabel(allocation: (typeof existingAllocations)[number]): string {
    switch (allocation.destination) {
      case "savings":
        return "Épargne";
      case "report":
        return "Report sur le mois suivant";
      case "envelope":
        return `Enveloppe (mois suivant) : ${envelopeLabelsForAllocations.get(allocation.envelopeId) ?? ""}`;
      case "provision":
        return provisionLabels.get(allocation.provisionId) ?? "Provision";
    }
  }
  const previousAllocationsDisplay = existingAllocations.map((allocation) => ({
    label: allocationLabel(allocation),
    amount: moneyToEuros(allocation.amount),
  }));

  // "Il te reste ce mois-ci" (SPEC.md's Dashboard du mois): what's left of the
  // disposable income once this month's envelope expenses and provision
  // contributions are set aside — split into what's still to spend, still to
  // pay, and genuinely free.
  const totalEnvelopeSpent = sumMoney(
    Array.from(envelopeConsumption.values()).map((entry) => entry.spent),
  );
  const totalEnvelopeBudget = sumMoney(budgetMonth.envelopeBudgets.map((entry) => entry.budget));
  const totalContributed = sumMoney(contributionsThisMonth.map((c) => c.amount));
  const left = subtractMoney(subtractMoney(disposableIncome, totalEnvelopeSpent), totalContributed);
  const toSpend = sumMoney(
    Array.from(envelopeConsumption.values()).map((entry) =>
      entry.remaining.cents > 0 ? entry.remaining : moneyFromCents(0),
    ),
  );
  const toPay = sumMoney(
    budgetMonth.provisionTargets.map((entry) => {
      const paid = provisionLedger.get(entry.provisionId)?.paidThisMonth ?? moneyFromCents(0);
      const remaining = subtractMoney(entry.target, paid);
      return remaining.cents > 0 ? remaining : moneyFromCents(0);
    }),
  );
  const free = subtractMoney(subtractMoney(left, toSpend), toPay);
  const stackTotal = Math.max(1, toSpend.cents + toPay.cents + Math.max(0, free.cents));

  const today = resolveCurrentMonth();
  const closureDue = budgetMonth.status === "open" && isMonthAfter(today, activeMonth);

  const canAddExpense =
    activeCategories.length > 0 &&
    (budgetMonth.envelopeBudgets.length > 0 || activeProvisions.length > 0);
  const canAddContribution = activeProvisions.length > 0;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="font-heading text-[34px] leading-tight">
            {formatMonthLabel(activeMonth)}
          </h1>
          <p className="mt-1.5 text-muted-foreground">
            {expenses.length > 0
              ? `${expenses.length} dépense${expenses.length > 1 ? "s" : ""} ce mois-ci.`
              : "Rien de saisi pour l'instant. Ajoute ta première dépense."}
          </p>
        </div>
        {budgetMonth.status === "open" ? (
          <AddOperationDialogs
            canAddExpense={canAddExpense}
            canAddContribution={canAddContribution}
            envelopes={budgetMonth.envelopeBudgets.map((entry) => ({
              id: entry.envelopeId,
              label: entry.label,
            }))}
            provisions={activeProvisions.map((provision) => ({
              id: provision.id,
              label: provision.label,
            }))}
            categories={activeCategories.map((category) => ({
              id: category.id,
              label: category.label,
            }))}
            minDate={formatCalendarDate(firstDayOfMonth(activeMonth))}
            maxDate={formatCalendarDate(lastDayOfMonth(activeMonth))}
            defaultDate={new Date().toISOString().slice(0, 10)}
            knownPlaces={knownPlaces}
            lastUsedCategoryId={lastUsedCategoryId}
          />
        ) : null}
      </div>

      {budgetMonth.status === "open" && !canAddExpense ? (
        <p className="text-sm text-muted-foreground">
          Crée d'abord une catégorie dans les paramètres pour pouvoir saisir une dépense.
        </p>
      ) : null}

      {closureDue ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent bg-accent/10 px-4 py-3 text-sm">
          <span>
            <strong>{formatMonthLabel(today)} a commencé.</strong> Clôture{" "}
            {formatMonthLabel(activeMonth)} pour ouvrir le mois suivant.
          </span>
        </div>
      ) : null}

      {budgetMonth.status === "closed" ? (
        <Card>
          <CardHeader>
            <CardTitle>Mois clôturé</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              Reliquat de clôture :{" "}
              <strong className={leftover.cents < 0 ? "text-destructive" : ""}>
                {formatEuros(moneyToEuros(leftover))}
              </strong>
              {savingsFunded.cents > 0
                ? ` dont ${formatEuros(moneyToEuros(savingsFunded))} financés par l'épargne`
                : ""}
            </p>
            {previousAllocationsDisplay.length > 0 ? (
              <ul className="flex flex-col gap-1 text-muted-foreground">
                {previousAllocationsDisplay.map((allocation, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: several allocations can share the same destination across closings
                  <li key={`${allocation.label}-${index}`} className="flex justify-between">
                    <span>Réparti vers {allocation.label}</span>
                    <span>{formatEuros(allocation.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <ReopenMonthForm />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-12 gap-5">
        {free.cents < 0 ? (
          <div className="col-span-12 rounded-md border border-l-4 border-l-alert-warning bg-card px-4 py-2.5 text-sm">
            Tes enveloppes et provisions dépassent de{" "}
            {formatEuros(moneyToEuros(moneyFromCents(Math.abs(free.cents))))} ce que le mois permet.
            C'est un indicateur : rien n'est bloqué.
          </div>
        ) : null}
        {allocationBase.cents < 0 ? (
          <div className="col-span-12 rounded-md border border-l-4 border-l-alert-warning bg-card px-4 py-2.5 text-sm">
            Les postes fixes et enveloppes en montant dépassent le reste à vivre.
          </div>
        ) : null}

        <Card className="col-span-12 p-6">
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-14">
            <div>
              <p className="text-sm text-muted-foreground">Il te reste ce mois-ci</p>
              <p
                className={`mt-1 mb-4 font-heading text-[40px] leading-none ${left.cents < 0 ? "text-destructive" : ""}`}
              >
                {formatEuros(moneyToEuros(left))}
              </p>
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted">
                {toSpend.cents > 0 ? (
                  <div
                    className="h-full bg-alert-ok"
                    style={{ width: `${(toSpend.cents / stackTotal) * 100}%` }}
                  />
                ) : null}
                {toPay.cents > 0 ? (
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${(toPay.cents / stackTotal) * 100}%` }}
                  />
                ) : null}
                {free.cents > 0 ? (
                  <div
                    className="h-full bg-muted-foreground/40"
                    style={{ width: `${(free.cents / stackTotal) * 100}%` }}
                  />
                ) : null}
              </div>
            </div>
            <dl className="flex flex-col justify-center gap-1.5 text-sm">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-alert-ok" />
                <dt className="flex-1">À dépenser dans les enveloppes</dt>
                <dd>{formatEuros(moneyToEuros(toSpend))}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" />
                <dt className="flex-1">À verser sur les provisions</dt>
                <dd>{formatEuros(moneyToEuros(toPay))}</dd>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/40" />
                <dt className="flex-1">Libre, non engagé</dt>
                <dd className={free.cents < 0 ? "text-destructive" : ""}>
                  {formatEuros(moneyToEuros(free))}
                </dd>
              </div>
            </dl>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm text-muted-foreground sm:grid-cols-4">
            <div>
              Revenu
              <p className="font-heading text-[17px] text-foreground">
                {formatEuros(moneyToEuros(budgetMonth.income))}
              </p>
            </div>
            <div>
              Postes fixes
              <p className="font-heading text-[17px] text-foreground">
                {formatEuros(moneyToEuros(totalFixed))}
              </p>
            </div>
            <div>
              Reste à vivre
              <p className="font-heading text-[17px] text-foreground">
                {formatEuros(moneyToEuros(disposableIncome))}
              </p>
            </div>
            <div>
              Marge prévisionnelle
              <p
                className={`font-heading text-[17px] ${forecastMargin.cents < 0 ? "text-destructive" : "text-foreground"}`}
              >
                {formatEuros(moneyToEuros(forecastMargin))}
              </p>
            </div>
          </div>
          {carriedOver.cents > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Dont {formatEuros(moneyToEuros(carriedOver))} reportés du mois précédent
            </p>
          ) : null}
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          <CardHeader>
            <CardTitle>Enveloppes variables</CardTitle>
            <CardAction className="text-sm text-muted-foreground">
              {formatEuros(moneyToEuros(totalEnvelopeSpent))} dépensés sur{" "}
              {formatEuros(moneyToEuros(totalEnvelopeBudget))}
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="flex flex-col">
              {budgetMonth.envelopeBudgets.map((entry) => {
                const consumption = envelopeConsumption.get(entry.envelopeId);
                const bonus = envelopeBonuses.get(entry.envelopeId) ?? moneyFromCents(0);
                const remaining = consumption?.remaining ?? entry.budget;
                const pct =
                  consumption && entry.budget.cents > 0
                    ? (consumption.spent.cents / entry.budget.cents) * 100
                    : consumption && consumption.spent.cents > 0
                      ? 100
                      : 0;
                return (
                  <li
                    key={entry.envelopeId}
                    className="flex flex-col gap-2 border-t p-4 first:border-t-0 sm:flex-row sm:items-center sm:gap-5"
                  >
                    <div className="sm:w-44 sm:shrink-0">
                      <p className="font-semibold">{entry.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.mode === "amount" ? "Montant fixe" : `${entry.value} % de la base`}
                      </p>
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5">
                      {consumption ? (
                        <Meter
                          percent={pct}
                          className={CONSUMPTION_LEVEL_BG_CLASSES[consumption.level]}
                        />
                      ) : null}
                      {bonus.cents > 0 ? (
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Bonus reporté du mois précédent</span>
                          <span>+{formatEuros(moneyToEuros(bonus))}</span>
                        </div>
                      ) : null}
                      {consumption ? (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${CONSUMPTION_LEVEL_BG_CLASSES[consumption.level]}`}
                            />
                            <span className={CONSUMPTION_LEVEL_TEXT_CLASSES[consumption.level]}>
                              {CONSUMPTION_LEVEL_LABELS[consumption.level]}
                            </span>
                          </span>
                          <span>
                            {formatEuros(moneyToEuros(consumption.spent))} dépensés sur{" "}
                            {formatEuros(moneyToEuros(entry.budget))}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right sm:w-28 sm:shrink-0">
                      <p
                        className={`font-heading text-lg ${remaining.cents < 0 ? "text-destructive" : ""}`}
                      >
                        {formatEuros(moneyToEuros(remaining))}
                      </p>
                      <p className="text-xs text-muted-foreground">restant</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader>
            <CardTitle>Provisions</CardTitle>
            <CardAction>
              <Link
                href="/provisions"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Tout voir
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {budgetMonth.provisionTargets.length > 0 ? (
              <ul className="flex flex-col">
                {budgetMonth.provisionTargets.flatMap((entry) => {
                  const provision = provisionsById.get(entry.provisionId);
                  if (!provision) return [];
                  const ledger = provisionLedger.get(entry.provisionId);
                  const pct =
                    ledger && provision.target.cents > 0
                      ? (ledger.balance.cents / provision.target.cents) * 100
                      : 0;
                  return [
                    <li
                      key={entry.provisionId}
                      className="flex flex-col gap-1.5 border-t p-3 first:border-t-0"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{entry.label}</span>
                        <ProvisionStatusBadge
                          provision={provision}
                          target={entry.target}
                          balance={ledger?.balance ?? moneyFromCents(0)}
                          paidThisMonth={ledger?.paidThisMonth ?? moneyFromCents(0)}
                        />
                      </div>
                      {ledger ? <Meter percent={pct} className="bg-accent" /> : null}
                      {ledger ? (
                        <p className="text-xs text-muted-foreground">
                          {formatEuros(moneyToEuros(ledger.balance))} sur{" "}
                          {formatEuros(moneyToEuros(provision.target))}, cible du mois{" "}
                          {formatEuros(moneyToEuros(entry.target))}
                        </p>
                      ) : null}
                    </li>,
                  ];
                })}
              </ul>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                Aucune provision active ce mois-ci.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-12">
          <CardHeader>
            <CardTitle>Pointage</CardTitle>
            <p className="text-sm text-muted-foreground">
              {budgetMonth.fixedEntries.filter((entry) => entry.status === "done").length} sur{" "}
              {budgetMonth.fixedEntries.length} effectués
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {(["charge", "scheduledSaving"] as const).flatMap((type) => {
              const entries = budgetMonth.fixedEntries.filter((entry) => entry.type === type);
              if (entries.length === 0) return [];
              return [
                <div key={type} className="flex flex-col gap-1.5">
                  <p className="text-sm font-medium text-muted-foreground">
                    {FIXED_ENTRY_TYPE_LABELS[type]}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {entries.map((entry) =>
                      budgetMonth.status === "open" ? (
                        <li key={`${entry.fixedEntryId}-${entry.status}`}>
                          <PointageCheckbox
                            fixedEntryId={entry.fixedEntryId}
                            label={entry.label}
                            amountLabel={formatEuros(moneyToEuros(entry.amount))}
                            defaultChecked={entry.status === "done"}
                          />
                        </li>
                      ) : (
                        <li key={entry.fixedEntryId} className="flex justify-between text-sm">
                          <span className={entry.status === "done" ? "line-through" : ""}>
                            {entry.label}
                          </span>
                          <span className="text-muted-foreground">
                            {formatEuros(moneyToEuros(entry.amount))} ·{" "}
                            {entry.status === "done" ? "effectué" : "programmé"}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>,
              ];
            })}
          </CardContent>
        </Card>

        {budgetMonth.status === "open" ? (
          <CloseMonthTeaser
            monthLabel={formatMonthLabel(activeMonth)}
            envelopeRemainders={envelopeRemainders}
            leftover={moneyToEuros(leftover)}
            allocatable={moneyToEuros(allocatable)}
            previousAllocations={previousAllocationsDisplay}
            provisions={budgetMonth.provisionTargets.map((entry) => ({
              id: entry.provisionId,
              label: entry.label,
            }))}
            nextMonthEnvelopes={nextMonthEnvelopes}
            nextMonthIsOpen={nextMonthIsOpen}
          />
        ) : null}
      </div>
    </div>
  );
}
