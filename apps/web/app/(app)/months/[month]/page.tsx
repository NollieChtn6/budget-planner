import { findBudgetMonthByMonth, prisma } from "@budget/db";
import {
  computeAllocationBase,
  computeDisposableIncome,
  computeForecastMargin,
  computeUnallocated,
  formatMonth,
  moneyToEuros,
  previousMonth,
} from "@budget/domain";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import { OpenMonthForm } from "./open-month-form";

function euros(amount: number): string {
  return `${amount.toFixed(2)} €`;
}

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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{formatMonth(currentMonth)}</h1>

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
        <CardContent className="flex flex-col gap-2">
          <ul className="flex flex-col gap-1 text-sm">
            {budgetMonth.envelopeBudgets.map((entry) => (
              <li key={entry.envelopeId} className="flex justify-between">
                <span>{entry.label}</span>
                <span>{euros(moneyToEuros(entry.budget))}</span>
              </li>
            ))}
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
          <ul className="flex flex-col gap-1 text-sm">
            {budgetMonth.provisionTargets.map((entry) => (
              <li key={entry.provisionId} className="flex justify-between">
                <span>{entry.label}</span>
                <span>{euros(moneyToEuros(entry.target))}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
