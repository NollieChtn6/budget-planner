import {
  findBudgetMonthByMonth,
  findCategoriesByUser,
  findContributionsByUserAndProvision,
  findExpensesByUserAndMonth,
  findExpensesByUserAndProvision,
  findKnownPlacesByUser,
  findLastUsedCategoryIdByUser,
  findLeftoverAllocationsByUserAndMonth,
  findProvisionsByUser,
  findVariableEnvelopesByUser,
  prisma,
} from "@budget/db";
import {
  activeVersionAt,
  addMoney,
  type ConsumptionLevel,
  type Contribution,
  compareCalendarDates,
  computeAllocationBase,
  computeCarriedOver,
  computeConsumptionLevel,
  computeContributionSurplus,
  computeDisposableIncome,
  computeEnvelopeBonus,
  computeForecastMargin,
  computeLeftover,
  computeProvisionBalance,
  computeRemaining,
  computeSavingsFundedAmount,
  computeSpent,
  computeUnallocated,
  type Expense,
  type ExpenseSource,
  type FixedEntryType,
  firstDayOfMonth,
  formatCalendarDate,
  isMonthAfter,
  isProvisionDone,
  isSameMonth,
  lastDayOfMonth,
  type Money,
  moneyFromCents,
  moneyToEuros,
  monthOfCalendarDate,
  nextMonth,
  previousMonth,
  subtractMoney,
  sumMoney,
} from "@budget/domain";
import { Meter } from "@/components/meter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CONSUMPTION_LEVEL_BG_CLASSES,
  CONSUMPTION_LEVEL_LABELS,
  CONSUMPTION_LEVEL_TEXT_CLASSES,
} from "@/lib/alert-level";
import { resolveActiveMonth, resolveCurrentMonth } from "@/lib/current-month";
import { formatEuros } from "@/lib/format-money";
import { formatMonthLabel } from "@/lib/format-month-label";
import { requireSession } from "@/lib/session";
import { AddContributionForm } from "./months/[month]/add-contribution-form";
import { AddExpenseForm } from "./months/[month]/add-expense-form";
import { CloseMonthForm } from "./months/[month]/close-month-form";
import { ContributionRow } from "./months/[month]/contribution-row";
import { ExpenseRow } from "./months/[month]/expense-row";
import { OpenMonthForm } from "./months/[month]/open-month-form";
import { PointageCheckbox } from "./months/[month]/pointage-checkbox";
import { ReopenMonthForm } from "./months/[month]/reopen-month-form";

const FIXED_ENTRY_TYPE_LABELS: Record<FixedEntryType, string> = {
  charge: "Charges",
  scheduledSaving: "Épargne programmée",
};

export default async function HomePage() {
  const session = await requireSession();
  const activeMonth = await resolveActiveMonth(prisma, session.user.id);
  const budgetMonth = await findBudgetMonthByMonth(prisma, session.user.id, activeMonth);

  if (!budgetMonth) {
    const previousMonthRow = await findBudgetMonthByMonth(
      prisma,
      session.user.id,
      previousMonth(activeMonth),
    );
    const canOpen = !previousMonthRow || previousMonthRow.status === "closed";

    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-[34px] leading-tight">{formatMonthLabel(activeMonth)}</h1>
        {canOpen ? (
          <OpenMonthForm />
        ) : (
          <p className="text-sm text-muted-foreground">
            Le mois précédent doit d'abord être clôturé.
          </p>
        )}
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
  const nextMonthEnvelopes = allEnvelopes
    .filter((envelope) => activeVersionAt(envelope, nextMonth(activeMonth)))
    .map((envelope) => ({ id: envelope.id, label: envelope.label }));
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

  const percentageBudgets = budgetMonth.envelopeBudgets
    .filter((entry) => entry.mode === "percentage")
    .map((entry) => entry.budget);
  const unallocated = computeUnallocated(allocationBase, percentageBudgets);

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
  const categoryLabels = new Map(categories.map((category) => [category.id, category.label]));
  const envelopeLabels = new Map(
    budgetMonth.envelopeBudgets.map((entry) => [entry.envelopeId, entry.label]),
  );
  const provisionLabels = new Map(
    budgetMonth.provisionTargets.map((entry) => [entry.provisionId, entry.label]),
  );
  const provisionGoals = new Map(provisions.map((provision) => [provision.id, provision.target]));

  function targetLabel(source: ExpenseSource): string {
    return source.type === "envelope"
      ? (envelopeLabels.get(source.envelopeId) ?? "")
      : `Provision : ${provisionLabels.get(source.provisionId) ?? ""}`;
  }

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

  const provisionLedger = new Map<
    string,
    { balance: Money; paidThisMonth: Money; surplus: Money; done: boolean }
  >();
  const contributionsThisMonth: Contribution[] = [];
  for (const entry of budgetMonth.provisionTargets) {
    const [contributions, provisionExpenses] = await Promise.all([
      findContributionsByUserAndProvision(prisma, session.user.id, entry.provisionId),
      findExpensesByUserAndProvision(prisma, session.user.id, entry.provisionId),
    ]);
    const balance = computeProvisionBalance(
      contributions.map((c) => c.amount),
      provisionExpenses,
    );
    const thisMonth = contributions.filter((c) =>
      isSameMonth(monthOfCalendarDate(c.date), activeMonth),
    );
    contributionsThisMonth.push(...thisMonth);
    const paidThisMonth = sumMoney(thisMonth.map((c) => c.amount));
    provisionLedger.set(entry.provisionId, {
      balance,
      paidThisMonth,
      surplus: computeContributionSurplus(entry.target, paidThisMonth),
      done: isProvisionDone(entry.target, paidThisMonth),
    });
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
    allEnvelopes.map((envelope) => [envelope.id, envelope.label]),
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

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="font-heading text-[34px] leading-tight">{formatMonthLabel(activeMonth)}</h1>
        <p className="mt-1.5 text-muted-foreground">
          {expenses.length > 0
            ? `${expenses.length} dépense${expenses.length > 1 ? "s" : ""} ce mois-ci.`
            : "Rien de saisi pour l'instant. Ajoute ta première dépense."}
        </p>
      </div>

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
        <Card className="col-span-12 p-6">
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
          <dl className="mt-3.5 flex flex-col gap-1.5 text-sm">
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
          <div className="mt-4 grid grid-cols-4 gap-3 border-t pt-4 text-sm text-muted-foreground">
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
          {allocationBase.cents < 0 ? (
            <p className="mt-1 text-sm text-destructive">
              Les postes fixes et enveloppes en montant dépassent le reste à vivre.
            </p>
          ) : null}
        </Card>

        <Card className="col-span-12 lg:col-span-7">
          <CardHeader>
            <CardTitle>Enveloppes variables</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-4">
              {budgetMonth.envelopeBudgets.map((entry) => {
                const consumption = envelopeConsumption.get(entry.envelopeId);
                const bonus = envelopeBonuses.get(entry.envelopeId) ?? moneyFromCents(0);
                const pct =
                  consumption && entry.budget.cents > 0
                    ? (consumption.spent.cents / entry.budget.cents) * 100
                    : consumption && consumption.spent.cents > 0
                      ? 100
                      : 0;
                return (
                  <li key={entry.envelopeId} className="flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="font-semibold">{entry.label}</span>
                      <span className="font-heading">
                        {formatEuros(moneyToEuros(consumption?.remaining ?? entry.budget))}
                      </span>
                    </div>
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
                        <span className={CONSUMPTION_LEVEL_TEXT_CLASSES[consumption.level]}>
                          {CONSUMPTION_LEVEL_LABELS[consumption.level]}
                        </span>
                        <span>
                          {formatEuros(moneyToEuros(consumption.spent))} dépensés sur{" "}
                          {formatEuros(moneyToEuros(entry.budget))}
                        </span>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <p className="text-sm text-muted-foreground">
              Non attribué : {formatEuros(moneyToEuros(unallocated))}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader>
            <CardTitle>Provisions</CardTitle>
          </CardHeader>
          <CardContent>
            {budgetMonth.provisionTargets.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {budgetMonth.provisionTargets.map((entry) => {
                  const ledger = provisionLedger.get(entry.provisionId);
                  const goal = provisionGoals.get(entry.provisionId);
                  const pct =
                    ledger && goal && goal.cents > 0
                      ? (ledger.balance.cents / goal.cents) * 100
                      : 0;
                  return (
                    <li key={entry.provisionId} className="flex flex-col gap-1.5">
                      <div className="flex justify-between">
                        <span className="font-semibold">{entry.label}</span>
                        <span className="text-sm text-muted-foreground">
                          Cible du mois : {formatEuros(moneyToEuros(entry.target))}
                        </span>
                      </div>
                      {ledger ? <Meter percent={pct} className="bg-accent" /> : null}
                      {ledger ? (
                        <div className="flex flex-col text-xs text-muted-foreground">
                          <span>
                            Solde {formatEuros(moneyToEuros(ledger.balance))}
                            {goal ? ` sur ${formatEuros(moneyToEuros(goal))}` : ""}
                          </span>
                          <span>
                            Versé ce mois {formatEuros(moneyToEuros(ledger.paidThisMonth))}
                            {ledger.done ? <span className="text-positive"> · Pointée</span> : null}
                            {ledger.surplus.cents > 0 ? (
                              <span className="text-positive">
                                {" "}
                                · Avance de {formatEuros(moneyToEuros(ledger.surplus))}
                              </span>
                            ) : null}
                          </span>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune provision active ce mois-ci.</p>
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
      </div>

      {budgetMonth.status === "open" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {activeCategories.length > 0 &&
          (budgetMonth.envelopeBudgets.length > 0 || budgetMonth.provisionTargets.length > 0) ? (
            <AddExpenseForm
              envelopes={budgetMonth.envelopeBudgets.map((entry) => ({
                id: entry.envelopeId,
                label: entry.label,
              }))}
              provisions={budgetMonth.provisionTargets.map((entry) => ({
                id: entry.provisionId,
                label: entry.label,
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
          ) : (
            <p className="text-sm text-muted-foreground">
              Crée d'abord une catégorie dans les paramètres pour pouvoir saisir une dépense.
            </p>
          )}
          {budgetMonth.provisionTargets.length > 0 ? (
            <AddContributionForm
              provisions={budgetMonth.provisionTargets.map((entry) => ({
                id: entry.provisionId,
                label: entry.label,
              }))}
              minDate={formatCalendarDate(firstDayOfMonth(activeMonth))}
              maxDate={formatCalendarDate(lastDayOfMonth(activeMonth))}
              defaultDate={new Date().toISOString().slice(0, 10)}
            />
          ) : null}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dépenses du mois</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  categoryLabel={categoryLabels.get(expense.categoryId) ?? ""}
                  targetLabel={targetLabel(expense.source)}
                  envelopes={budgetMonth.envelopeBudgets.map((entry) => ({
                    id: entry.envelopeId,
                    label: entry.label,
                  }))}
                  provisions={budgetMonth.provisionTargets.map((entry) => ({
                    id: entry.provisionId,
                    label: entry.label,
                  }))}
                  categories={categories.map((category) => ({
                    id: category.id,
                    label: category.label,
                  }))}
                  minDate={formatCalendarDate(firstDayOfMonth(activeMonth))}
                  maxDate={formatCalendarDate(lastDayOfMonth(activeMonth))}
                  editable={budgetMonth.status === "open"}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune dépense ce mois-ci.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versements du mois</CardTitle>
        </CardHeader>
        <CardContent>
          {contributionsThisMonth.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {contributionsThisMonth.map((contribution) => (
                <ContributionRow
                  key={contribution.id}
                  contribution={contribution}
                  provisionLabel={provisionLabels.get(contribution.provisionId) ?? ""}
                  provisions={budgetMonth.provisionTargets.map((entry) => ({
                    id: entry.provisionId,
                    label: entry.label,
                  }))}
                  minDate={formatCalendarDate(firstDayOfMonth(activeMonth))}
                  maxDate={formatCalendarDate(lastDayOfMonth(activeMonth))}
                  editable={budgetMonth.status === "open"}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun versement ce mois-ci.</p>
          )}
        </CardContent>
      </Card>

      {budgetMonth.status === "open" ? (
        <CloseMonthForm
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
  );
}
