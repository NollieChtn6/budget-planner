import {
  findBudgetMonthByMonth,
  findCategoriesByUser,
  findContributionsByUserAndProvision,
  findExpensesByUserAndMonth,
  findExpensesByUserAndProvision,
  findLeftoverAllocationsByUserAndMonth,
  findProvisionsByUser,
  prisma,
} from "@budget/db";
import {
  type CalendarDate,
  type ConsumptionLevel,
  type Contribution,
  compareCalendarDates,
  computeAllocationBase,
  computeConsumptionLevel,
  computeContributionSurplus,
  computeDisposableIncome,
  computeForecastMargin,
  computeLeftover,
  computeProvisionBalance,
  computeRemaining,
  computeSavingsFundedAmount,
  computeSpent,
  computeUnallocated,
  type Expense,
  type ExpenseSource,
  firstDayOfMonth,
  formatCalendarDate,
  formatMonth,
  isProvisionDone,
  isSameMonth,
  lastDayOfMonth,
  type Money,
  moneyToEuros,
  monthOfCalendarDate,
  previousMonth,
  subtractMoney,
  sumMoney,
} from "@budget/domain";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import { AddContributionForm } from "./add-contribution-form";
import { AddExpenseForm } from "./add-expense-form";
import { CloseMonthForm } from "./close-month-form";
import { OpenMonthForm } from "./open-month-form";
import { ReopenMonthForm } from "./reopen-month-form";

function euros(amount: number): string {
  return `${amount.toFixed(2)} €`;
}

function formatDay(date: CalendarDate): string {
  return `${date.day.toString().padStart(2, "0")}/${date.month.toString().padStart(2, "0")}`;
}

const CONSUMPTION_LEVEL_LABELS: Record<ConsumptionLevel, string> = {
  ok: "Tranquille",
  watch: "À surveiller",
  caution: "Attention",
  warning: "Alerte",
  critical: "Presque vide",
  exceeded: "Dépassement",
};

const CONSUMPTION_LEVEL_CLASSES: Record<ConsumptionLevel, string> = {
  ok: "text-green-600 dark:text-green-400",
  watch: "text-lime-600 dark:text-lime-400",
  caution: "text-yellow-600 dark:text-yellow-400",
  warning: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
  exceeded: "text-purple-600 dark:text-purple-400",
};

export default async function MonthPage({ params }: { params: Promise<{ month: string }> }) {
  const { month: monthParam } = await params;
  const session = await requireSession();
  const currentMonth = resolveCurrentMonth();

  if (monthParam !== formatMonth(currentMonth)) {
    redirect(`/months/${formatMonth(currentMonth)}`);
  }

  const budgetMonth = await findBudgetMonthByMonth(prisma, session.user.id, currentMonth);

  if (!budgetMonth) {
    const previousMonthRow = await findBudgetMonthByMonth(
      prisma,
      session.user.id,
      previousMonth(currentMonth),
    );
    const canOpen = !previousMonthRow || previousMonthRow.status === "closed";

    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <h1 className="text-2xl font-semibold">{formatMonth(currentMonth)}</h1>
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

  const fixedEntryAmounts = budgetMonth.fixedEntries.map((entry) => entry.amount);
  const disposableIncome = computeDisposableIncome(budgetMonth.income, fixedEntryAmounts);

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

  const [expenses, categories, provisions] = await Promise.all([
    findExpensesByUserAndMonth(prisma, session.user.id, currentMonth),
    findCategoriesByUser(prisma, session.user.id),
    findProvisionsByUser(prisma, session.user.id),
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
    envelopeConsumption.set(entry.envelopeId, {
      spent,
      remaining: computeRemaining(entry.budget, spent),
      level: computeConsumptionLevel(entry.budget, spent),
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
      isSameMonth(monthOfCalendarDate(c.date), currentMonth),
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
    currentMonth,
  );
  const previouslyAllocated = sumMoney(existingAllocations.map((a) => a.amount));
  const allocatable = subtractMoney(leftover, previouslyAllocated);
  const previousAllocationsDisplay = existingAllocations.map((allocation) => ({
    label:
      allocation.destination === "savings"
        ? "Épargne"
        : (provisionLabels.get(allocation.provisionId) ?? "Provision"),
    amount: moneyToEuros(allocation.amount),
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{formatMonth(currentMonth)}</h1>

      {budgetMonth.status === "closed" ? (
        <Card>
          <CardHeader>
            <CardTitle>Mois clôturé</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              Reliquat de clôture :{" "}
              <strong className={leftover.cents < 0 ? "text-destructive" : ""}>
                {euros(moneyToEuros(leftover))}
              </strong>
              {savingsFunded.cents > 0
                ? ` dont ${euros(moneyToEuros(savingsFunded))} financés par l'épargne`
                : ""}
            </p>
            {previousAllocationsDisplay.length > 0 ? (
              <ul className="flex flex-col gap-1 text-muted-foreground">
                {previousAllocationsDisplay.map((allocation, index) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: several allocations can share the same destination across closings
                  <li key={`${allocation.label}-${index}`} className="flex justify-between">
                    <span>Réparti vers {allocation.label}</span>
                    <span>{euros(allocation.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <ReopenMonthForm />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Reste à vivre</CardTitle>
          <CardDescription>Revenu moins postes fixes</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p className="text-lg font-medium">{euros(moneyToEuros(disposableIncome))}</p>
          {allocationBase.cents < 0 ? (
            <p className="text-destructive">
              Les postes fixes et enveloppes en montant dépassent le reste à vivre.
            </p>
          ) : null}
          <p className={forecastMargin.cents < 0 ? "text-destructive" : "text-muted-foreground"}>
            Marge prévisionnelle : {euros(moneyToEuros(forecastMargin))}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Postes fixes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-1 text-sm">
            {budgetMonth.fixedEntries.map((entry) => (
              <li key={entry.fixedEntryId} className="flex justify-between">
                <span>{entry.label}</span>
                <span>
                  {euros(moneyToEuros(entry.amount))} ·{" "}
                  {entry.status === "done" ? "effectué" : "programmé"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enveloppes variables</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2 text-sm">
            {budgetMonth.envelopeBudgets.map((entry) => {
              const consumption = envelopeConsumption.get(entry.envelopeId);
              return (
                <li key={entry.envelopeId} className="flex flex-col gap-0.5">
                  <div className="flex justify-between">
                    <span>{entry.label}</span>
                    <span>{euros(moneyToEuros(entry.budget))}</span>
                  </div>
                  {consumption ? (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className={CONSUMPTION_LEVEL_CLASSES[consumption.level]}>
                        {CONSUMPTION_LEVEL_LABELS[consumption.level]}
                      </span>
                      <span>
                        {euros(moneyToEuros(consumption.spent))} dépensés ·{" "}
                        <span className={consumption.remaining.cents < 0 ? "text-destructive" : ""}>
                          {euros(moneyToEuros(consumption.remaining))} restants
                        </span>
                      </span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted-foreground">
            Non attribué : {euros(moneyToEuros(unallocated))}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provisions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {budgetMonth.provisionTargets.map((entry) => {
              const ledger = provisionLedger.get(entry.provisionId);
              const goal = provisionGoals.get(entry.provisionId);
              return (
                <li key={entry.provisionId} className="flex flex-col gap-0.5">
                  <div className="flex justify-between">
                    <span>{entry.label}</span>
                    <span>Cible du mois : {euros(moneyToEuros(entry.target))}</span>
                  </div>
                  {ledger ? (
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <span>
                        Solde {euros(moneyToEuros(ledger.balance))}
                        {goal ? ` sur ${euros(moneyToEuros(goal))}` : ""}
                      </span>
                      <span>
                        Versé ce mois {euros(moneyToEuros(ledger.paidThisMonth))}
                        {ledger.done ? (
                          <span className="text-green-600 dark:text-green-400"> · Pointée</span>
                        ) : null}
                        {ledger.surplus.cents > 0 ? (
                          <span className="text-green-600 dark:text-green-400">
                            {" "}
                            · Avance de {euros(moneyToEuros(ledger.surplus))}
                          </span>
                        ) : null}
                      </span>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
          {budgetMonth.provisionTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune provision active ce mois-ci.</p>
          ) : null}
        </CardContent>
      </Card>

      {budgetMonth.status === "open" ? (
        activeCategories.length > 0 &&
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
            minDate={formatCalendarDate(firstDayOfMonth(currentMonth))}
            maxDate={formatCalendarDate(lastDayOfMonth(currentMonth))}
            defaultDate={new Date().toISOString().slice(0, 10)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Crée d'abord une catégorie dans les paramètres pour pouvoir saisir une dépense.
          </p>
        )
      ) : null}

      {budgetMonth.status === "open" && budgetMonth.provisionTargets.length > 0 ? (
        <AddContributionForm
          provisions={budgetMonth.provisionTargets.map((entry) => ({
            id: entry.provisionId,
            label: entry.label,
          }))}
          minDate={formatCalendarDate(firstDayOfMonth(currentMonth))}
          maxDate={formatCalendarDate(lastDayOfMonth(currentMonth))}
          defaultDate={new Date().toISOString().slice(0, 10)}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Dépenses du mois</CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm">
              {expenses.map((expense) => (
                <li key={expense.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{formatDay(expense.date)}</span>
                  <span className="flex-1">
                    {expense.place ? `${expense.place} · ` : ""}
                    {expense.description ?? categoryLabels.get(expense.categoryId)}
                    <span className="text-muted-foreground"> · {targetLabel(expense.source)}</span>
                    {expense.savingsDraw ? (
                      <span className="text-destructive">
                        {" "}
                        · {euros(moneyToEuros(expense.savingsDraw))} financés par l'épargne
                      </span>
                    ) : null}
                  </span>
                  <span>{euros(moneyToEuros(expense.amount))}</span>
                </li>
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
            <ul className="flex flex-col gap-1 text-sm">
              {contributionsThisMonth.map((contribution) => (
                <li key={contribution.id} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{formatDay(contribution.date)}</span>
                  <span className="flex-1">{provisionLabels.get(contribution.provisionId)}</span>
                  <span>{euros(moneyToEuros(contribution.amount))}</span>
                </li>
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
        />
      ) : null}
    </div>
  );
}
