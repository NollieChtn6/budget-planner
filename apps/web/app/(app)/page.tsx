import {
  findBudgetMonthByMonth,
  findCategoriesByUser,
  findContributionsByUserAndMonth,
  findExpensesByUserAndMonth,
  findExtraIncomesByUserAndMonth,
  findFixedEntriesByUser,
  findKnownPlacesByUser,
  findLastUsedCategoryIdByUser,
  findLeftoverAllocationsByUserAndMonth,
  findProvisionBalancesByUser,
  findProvisionsByUser,
  findRecentExpensesByUser,
  findReimbursementsByUserAndMonth,
  findSavingsTransfersByUserAndMonth,
  findVariableEnvelopesByUser,
  prisma,
} from "@budget/db";
import {
  activeFixedEntryVersionAt,
  activeVersionAt,
  addMoney,
  type ConsumptionLevel,
  type Contribution,
  computeAllocationBase,
  computeCarriedOver,
  computeConsumptionLevel,
  computeDisposableIncome,
  computeEnvelopeBonus,
  computeForecastMargin,
  computeLeftover,
  computeRemaining,
  computeRemainingProvisionTarget,
  computeSavingsFundedAmount,
  computeSpent,
  type Expense,
  type FixedEntryType,
  firstDayOfMonth,
  formatCalendarDate,
  isMonthAfter,
  lastDayOfMonth,
  type Money,
  moneyFromCents,
  moneyToEuros,
  nextMonth,
  type Provision,
  previousMonth,
  subtractMoney,
  sumMoney,
  summarizeConvertedUrges,
} from "@budget/domain";
import { SparklesIcon } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Meter } from "@/components/meter";
import { ProvisionStatusBadge } from "@/components/provision-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { envelopeLabelAt } from "@/lib/active-envelopes";
import {
  CONSUMPTION_LEVEL_BG_CLASSES,
  CONSUMPTION_LEVEL_LABELS,
  CONSUMPTION_LEVEL_TEXT_CLASSES,
} from "@/lib/alert-level";
import { resolveActiveMonth, resolveCurrentMonth } from "@/lib/current-month";
import { toExpenseLinkOptions } from "@/lib/expense-link-options";
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

/** How many of the latest expenses a reimbursement's "Dépense d'origine" proposes (R35). */
const RECENT_EXPENSE_LINK_LIMIT = 50;

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

  const [
    previousMonthAllocations,
    allEnvelopes,
    nextMonthRow,
    reimbursements,
    extraIncomes,
    savingsTransfers,
    monthContributions,
  ] = await Promise.all([
    findLeftoverAllocationsByUserAndMonth(prisma, session.user.id, previousMonth(activeMonth)),
    findVariableEnvelopesByUser(prisma, session.user.id),
    findBudgetMonthByMonth(prisma, session.user.id, nextMonth(activeMonth)),
    findReimbursementsByUserAndMonth(prisma, session.user.id, activeMonth),
    findExtraIncomesByUserAndMonth(prisma, session.user.id, activeMonth),
    findSavingsTransfersByUserAndMonth(prisma, session.user.id, activeMonth),
    findContributionsByUserAndMonth(prisma, session.user.id, activeMonth),
  ]);
  const reimbursementsTotal = sumMoney(reimbursements.map((r) => r.amount));
  const extraIncomeTotal = sumMoney(extraIncomes.map((e) => e.amount));
  const savingsTransfersTotal = sumMoney(savingsTransfers.map((t) => t.amount));
  const convertedUrges = summarizeConvertedUrges(savingsTransfers);
  // R37: only the contributions entered by hand since R37 are taken from the disposable income.
  const deductedContributions = monthContributions.filter(
    (contribution) => contribution.origin === "disposableIncome",
  );
  // R9, R11: reimbursements and extra incomes move the disposable income but not the allocation
  // base; so do savings transfers and the contributions taken from it.
  const oneOffInflowAmounts = [...reimbursements, ...extraIncomes].map((inflow) => inflow.amount);
  const withdrawalAmounts = [
    ...savingsTransfers.map((transfer) => transfer.amount),
    ...deductedContributions.map((contribution) => contribution.amount),
  ];
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
    oneOffInflowAmounts,
    withdrawalAmounts,
  );

  const amountModeValues = budgetMonth.envelopeBudgets
    .filter((entry) => entry.mode === "amount")
    .map((entry) => entry.value);
  const allocationBase = computeAllocationBase(
    disposableIncome,
    amountModeValues,
    oneOffInflowAmounts,
    withdrawalAmounts,
  );

  const forecastMargin = computeForecastMargin(
    disposableIncome,
    budgetMonth.envelopeBudgets.map((entry) => entry.budget),
    budgetMonth.provisionTargets.map((entry) =>
      computeRemainingProvisionTarget(
        entry.target,
        sumMoney(
          deductedContributions
            .filter((contribution) => contribution.provisionId === entry.provisionId)
            .map((contribution) => contribution.amount),
        ),
      ),
    ),
  );

  const [expenses, categories, provisions, knownPlaces, lastUsedCategoryId, recentExpenses] =
    await Promise.all([
      findExpensesByUserAndMonth(prisma, session.user.id, activeMonth),
      findCategoriesByUser(prisma, session.user.id),
      findProvisionsByUser(prisma, session.user.id),
      findKnownPlacesByUser(prisma, session.user.id),
      findLastUsedCategoryIdByUser(prisma, session.user.id),
      findRecentExpensesByUser(prisma, session.user.id, RECENT_EXPENSE_LINK_LIMIT),
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
  const provisionBalances = await findProvisionBalancesByUser(prisma, session.user.id);
  const targetedProvisionIds = new Set(budgetMonth.provisionTargets.map((e) => e.provisionId));
  // Already sorted by date and scoped to the active month.
  const contributionsThisMonth: Contribution[] = monthContributions.filter((c) =>
    targetedProvisionIds.has(c.provisionId),
  );
  for (const { provisionId } of budgetMonth.provisionTargets) {
    const paidThisMonth = sumMoney(
      contributionsThisMonth.filter((c) => c.provisionId === provisionId).map((c) => c.amount),
    );
    provisionLedger.set(provisionId, {
      balance: provisionBalances.get(provisionId) ?? moneyFromCents(0),
      paidThisMonth,
    });
  }

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
  // Contributions taken from the disposable income are already out of it (R37): only the others
  // are still to set aside here.
  const totalNotYetDeducted = sumMoney(
    contributionsThisMonth.filter((c) => c.origin !== "disposableIncome").map((c) => c.amount),
  );
  const left = subtractMoney(
    subtractMoney(disposableIncome, totalEnvelopeSpent),
    totalNotYetDeducted,
  );
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

  const includedInflows: { key: string; content: ReactNode }[] = [];
  if (carriedOver.cents > 0) {
    includedInflows.push({
      key: "carried-over",
      content: `${formatEuros(moneyToEuros(carriedOver))} reportés`,
    });
  }
  if (reimbursementsTotal.cents > 0) {
    includedInflows.push({
      key: "reimbursements",
      content: (
        <>
          <span className="text-positive">+{formatEuros(moneyToEuros(reimbursementsTotal))}</span>{" "}
          remboursements
        </>
      ),
    });
  }
  if (extraIncomeTotal.cents > 0) {
    includedInflows.push({
      key: "extra-income",
      content: (
        <>
          <span className="text-positive">+{formatEuros(moneyToEuros(extraIncomeTotal))}</span>{" "}
          entrées exceptionnelles
        </>
      ),
    });
  }

  const canAddExpense =
    activeCategories.length > 0 &&
    (budgetMonth.envelopeBudgets.length > 0 || activeProvisions.length > 0);
  const canAddContribution = activeProvisions.length > 0;
  const canAddReimbursement = activeCategories.length > 0;

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
            canAddReimbursement={canAddReimbursement}
            canAddExtraIncome
            canAddSavingsTransfer
            expenseOptions={toExpenseLinkOptions(recentExpenses)}
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
            knownPlaces={knownPlaces}
            lastUsedCategoryId={lastUsedCategoryId}
          />
        ) : null}
      </div>

      {budgetMonth.status === "open" && !canAddExpense ? (
        <p className="text-sm text-muted-foreground">
          Crée d'abord une catégorie dans les{" "}
          <Link href="/settings/categories" className="underline underline-offset-4">
            paramètres
          </Link>{" "}
          pour pouvoir saisir une dépense.
        </p>
      ) : null}

      {closureDue ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent bg-accent/10 px-4 py-3 text-sm">
          <span>
            <strong>{formatMonthLabel(today)} a commencé.</strong> Clôture{" "}
            {formatMonthLabel(activeMonth)} pour ouvrir le mois suivant.
          </span>
          <Button render={<a href="#cloture" />} variant="outline" size="sm">
            Aller à la clôture
          </Button>
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
          <div
            role="status"
            className="col-span-12 rounded-md border border-alert-warning/60 bg-card px-4 py-2.5 text-sm"
          >
            Tes enveloppes et provisions dépassent de{" "}
            {formatEuros(moneyToEuros(moneyFromCents(Math.abs(free.cents))))} ce que le mois permet.
            C'est un indicateur : rien n'est bloqué.
          </div>
        ) : null}
        {allocationBase.cents < 0 ? (
          <div
            role="status"
            className="col-span-12 rounded-md border border-alert-warning/60 bg-card px-4 py-2.5 text-sm"
          >
            Les postes fixes et enveloppes en montant dépassent le reste à vivre : les enveloppes en
            pourcentage sont à 0 €.
          </div>
        ) : null}

        <Card className="col-span-12 p-6">
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-14">
            <div>
              <p className="text-sm text-muted-foreground">Il te reste ce mois-ci</p>
              <p
                className={`mt-1 mb-4 font-heading text-[40px] leading-none ${left.cents < 0 ? "text-alert-warning-text" : ""}`}
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
                <dd className={free.cents < 0 ? "text-alert-warning-text" : ""}>
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
                className={`font-heading text-[17px] ${forecastMargin.cents < 0 ? "text-alert-warning-text" : "text-foreground"}`}
              >
                {formatEuros(moneyToEuros(forecastMargin))}
              </p>
            </div>
          </div>
          {includedInflows.length > 0 || savingsTransfersTotal.cents > 0 ? (
            <div className="mt-4 flex flex-col gap-1 border-t pt-3 text-sm text-muted-foreground">
              {includedInflows.length > 0 ? (
                <p>
                  Inclus :{" "}
                  {includedInflows.map((item, index) => (
                    <Fragment key={item.key}>
                      {index > 0 ? <span aria-hidden="true"> · </span> : null}
                      {item.content}
                    </Fragment>
                  ))}
                </p>
              ) : null}
              {savingsTransfersTotal.cents > 0 ? (
                <p>
                  {formatEuros(moneyToEuros(savingsTransfersTotal))} transférés vers l'épargne
                  {convertedUrges.count > 0 ? (
                    <>
                      , dont{" "}
                      <span className="text-positive">
                        {formatEuros(moneyToEuros(convertedUrges.total))}
                      </span>{" "}
                      d'envies{" "}
                      <span className="whitespace-nowrap">
                        converties ({convertedUrges.count}){" "}
                        <SparklesIcon aria-hidden className="inline size-3.5 align-text-bottom" />
                      </span>
                    </>
                  ) : null}
                </p>
              ) : null}
            </div>
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
                          label={`Consommation de ${entry.label}`}
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
                          {consumption.level !== "ok" ? (
                            <span className="flex items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 shrink-0 rounded-full ${CONSUMPTION_LEVEL_BG_CLASSES[consumption.level]}`}
                              />
                              <span className={CONSUMPTION_LEVEL_TEXT_CLASSES[consumption.level]}>
                                {CONSUMPTION_LEVEL_LABELS[consumption.level]}
                              </span>
                            </span>
                          ) : null}
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
                className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground md:min-h-0"
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
                      {ledger ? (
                        <Meter
                          percent={pct}
                          label={`Progression de ${entry.label}`}
                          className="bg-accent"
                        />
                      ) : null}
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
              const entries = budgetMonth.fixedEntries
                .filter((entry) => entry.type === type)
                .sort((a, b) => Number(a.status === "done") - Number(b.status === "done"));
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
