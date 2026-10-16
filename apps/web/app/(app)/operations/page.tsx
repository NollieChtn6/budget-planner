import {
  findBudgetMonthByMonth,
  findCategoriesByUser,
  findClosedBudgetMonthsByUser,
  findContributionsByUserAndMonth,
  findExpensesByUserAndMonth,
  findOpenBudgetMonthByUser,
  prisma,
} from "@budget/db";
import {
  firstDayOfMonth,
  formatCalendarDate,
  formatMonth,
  isMonthAfter,
  isMonthBefore,
  isSameMonth,
  lastDayOfMonth,
  type Month,
  moneyToEuros,
  parseMonth,
  sumMoney,
} from "@budget/domain";
import { MonthNav } from "@/components/month-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveActiveMonth } from "@/lib/current-month";
import { formatEuros } from "@/lib/format-money";
import { requireSession } from "@/lib/session";
import { ContributionRow } from "../_components/contribution-row";
import { ExpenseRow } from "../_components/expense-row";
import { OperationsFilters } from "./operations-filters";

function clampMonth(month: Month, min: Month, max: Month): Month {
  if (isMonthBefore(month, min)) return min;
  if (isMonthAfter(month, max)) return max;
  return month;
}

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; q?: string; category?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  const activeMonth = await resolveActiveMonth(prisma, session.user.id);
  const [closedMonths, openMonthRow] = await Promise.all([
    findClosedBudgetMonthsByUser(prisma, session.user.id),
    findOpenBudgetMonthByUser(prisma, session.user.id),
  ]);
  const firstMonth = closedMonths.at(-1)?.month ?? openMonthRow?.month ?? activeMonth;

  let requestedMonth: Month;
  try {
    requestedMonth = params.month ? parseMonth(params.month) : activeMonth;
  } catch {
    requestedMonth = activeMonth;
  }
  const viewedMonth = clampMonth(requestedMonth, firstMonth, activeMonth);

  const q = (params.q ?? "").trim();
  const categoryId = params.category ?? "";
  const buildHref = (month: Month) => `/operations?month=${formatMonth(month)}`;

  const budgetMonth = await findBudgetMonthByMonth(prisma, session.user.id, viewedMonth);

  const head = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-heading text-[34px] leading-tight">Opérations</h1>
        <MonthNav month={viewedMonth} min={firstMonth} max={activeMonth} buildHref={buildHref} />
      </div>
    </div>
  );

  if (!budgetMonth) {
    return (
      <div className="flex flex-col gap-6">
        {head}
        <p className="text-sm text-muted-foreground">Aucune opération ce mois-là.</p>
      </div>
    );
  }

  const [expenses, contributions, categories] = await Promise.all([
    findExpensesByUserAndMonth(prisma, session.user.id, viewedMonth),
    findContributionsByUserAndMonth(prisma, session.user.id, viewedMonth),
    findCategoriesByUser(prisma, session.user.id),
  ]);

  const categoryLabels = new Map(categories.map((category) => [category.id, category.label]));
  const envelopeLabels = new Map(
    budgetMonth.envelopeBudgets.map((entry) => [entry.envelopeId, entry.label]),
  );
  const provisionLabels = new Map(
    budgetMonth.provisionTargets.map((entry) => [entry.provisionId, entry.label]),
  );

  const qLower = q.toLowerCase();
  const filteredExpenses = expenses.filter((expense) => {
    if (categoryId && expense.categoryId !== categoryId) return false;
    if (!qLower) return true;
    const categoryLabel = categoryLabels.get(expense.categoryId) ?? "";
    return [expense.place, expense.description, categoryLabel]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(qLower);
  });

  const editable = isSameMonth(viewedMonth, activeMonth) && budgetMonth.status === "open";
  const minDate = formatCalendarDate(firstDayOfMonth(viewedMonth));
  const maxDate = formatCalendarDate(lastDayOfMonth(viewedMonth));
  const envelopeOptions = budgetMonth.envelopeBudgets.map((entry) => ({
    id: entry.envelopeId,
    label: entry.label,
  }));
  const provisionOptions = budgetMonth.provisionTargets.map((entry) => ({
    id: entry.provisionId,
    label: entry.label,
  }));

  const totalSpent = formatEuros(moneyToEuros(sumMoney(expenses.map((e) => e.amount))));
  const totalContributed = formatEuros(moneyToEuros(sumMoney(contributions.map((c) => c.amount))));

  return (
    <div className="flex flex-col gap-6">
      {head}
      <div className="flex gap-7 text-sm text-muted-foreground">
        <span>
          Dépensé <strong className="font-heading text-base text-foreground">{totalSpent}</strong>
        </span>
        <span>
          Mis de côté{" "}
          <strong className="font-heading text-base text-foreground">{totalContributed}</strong>
        </span>
      </div>
      <OperationsFilters
        month={formatMonth(viewedMonth)}
        q={q}
        categoryId={categoryId}
        categories={categories}
      />

      <Card>
        <CardHeader>
          <CardTitle>Dépenses</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredExpenses.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {filteredExpenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  categoryLabel={categoryLabels.get(expense.categoryId) ?? ""}
                  targetLabel={
                    expense.source.type === "envelope"
                      ? (envelopeLabels.get(expense.source.envelopeId) ?? "")
                      : `Provision : ${provisionLabels.get(expense.source.provisionId) ?? ""}`
                  }
                  envelopes={envelopeOptions}
                  provisions={provisionOptions}
                  categories={categories.map((category) => ({
                    id: category.id,
                    label: category.label,
                  }))}
                  minDate={minDate}
                  maxDate={maxDate}
                  editable={editable}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {expenses.length > 0
                ? "Aucune dépense ne correspond à ta recherche."
                : "Aucune dépense ce mois-là."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versements</CardTitle>
        </CardHeader>
        <CardContent>
          {contributions.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {contributions.map((contribution) => (
                <ContributionRow
                  key={contribution.id}
                  contribution={contribution}
                  provisionLabel={provisionLabels.get(contribution.provisionId) ?? ""}
                  provisions={provisionOptions}
                  minDate={minDate}
                  maxDate={maxDate}
                  editable={editable}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun versement ce mois-là.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
