import {
  findBudgetMonthByMonth,
  findCategoriesByUser,
  findClosedBudgetMonthsByUser,
  findContributionsByUserAndMonth,
  findExpensesByUserAndMonth,
  findExtraIncomesByUserAndMonth,
  findKnownPlacesByUser,
  findLastUsedCategoryIdByUser,
  findOpenBudgetMonthByUser,
  findProvisionsByUser,
  findRecentExpensesByUser,
  findReimbursementsByUserAndMonth,
  findSavingsTransfersByUserAndMonth,
  prisma,
} from "@budget/db";
import {
  type CalendarDate,
  compareCalendarDates,
  firstDayOfMonth,
  formatCalendarDate,
  formatMonth,
  isMonthAfter,
  isMonthBefore,
  isSameMonth,
  lastDayOfMonth,
  type Money,
  type Month,
  moneyToEuros,
  parseMonth,
  sumMoney,
} from "@budget/domain";
import Link from "next/link";
import type { ReactNode } from "react";
import { MonthNav } from "@/components/month-nav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveActiveMonth } from "@/lib/current-month";
import { toExpenseLinkOptions } from "@/lib/expense-link-options";
import { formatEuros } from "@/lib/format-money";
import { formatMonthLabel } from "@/lib/format-month-label";
import { requireSession } from "@/lib/session";
import { AddOperationDialogs } from "../_components/add-operation-dialogs";
import { ContributionRow } from "../_components/contribution-row";
import { ExpenseRow } from "../_components/expense-row";
import { ExtraIncomeRow } from "../_components/extra-income-row";
import { ReimbursementRow } from "../_components/reimbursement-row";
import { SavingsTransferRow } from "../_components/savings-transfer-row";
import { OperationsFilters } from "./operations-filters";

/** How many of the latest expenses a reimbursement's "Dépense d'origine" proposes (R35). */
const RECENT_EXPENSE_LINK_LIMIT = 50;

function clampMonth(month: Month, min: Month, max: Month): Month {
  if (isMonthBefore(month, min)) return min;
  if (isMonthAfter(month, max)) return max;
  return month;
}

/** One figure of the month's summary; an incoming figure that is nil reads "—" rather than "+0,00 €". */
function Total({
  label,
  amount,
  incoming = false,
  note,
}: {
  label: string;
  amount: Money;
  incoming?: boolean;
  note?: string;
}) {
  const nil = incoming && amount.cents === 0;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd
        className={`font-heading text-lg tabular-nums ${nil ? "text-muted-foreground" : incoming ? "text-positive" : "text-foreground"}`}
      >
        {nil ? "—" : `${incoming ? "+" : ""}${formatEuros(moneyToEuros(amount))}`}
      </dd>
      {note ? <dd className="text-[13px] text-muted-foreground">{note}</dd> : null}
    </div>
  );
}

/** One line of the operations table, whatever its kind (docs/ui maquette, opsTable). */
type OperationItem = {
  key: string;
  date: CalendarDate;
  /** Breaks ties between kinds dated the same day. */
  kindOrder: number;
  /** Only operations carrying a category match a category filter. */
  categoryId?: string;
  searchText: string;
  row: ReactNode;
};

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
  const requestedCategoryId = params.category ?? "";
  // Month navigation keeps the search and the category filter.
  const buildHref = (month: Month) => {
    const query = new URLSearchParams({ month: formatMonth(month) });
    if (q) query.set("q", q);
    if (requestedCategoryId) query.set("category", requestedCategoryId);
    return `/operations?${query.toString()}`;
  };

  // Only the latest closed month can be reopened, and only while no month is open (R29).
  const latestClosed = closedMonths[0];
  const canReopen =
    !openMonthRow && latestClosed !== undefined && isSameMonth(latestClosed.month, viewedMonth);

  const budgetMonth = await findBudgetMonthByMonth(prisma, session.user.id, viewedMonth);

  function renderHead(actions?: ReactNode) {
    return (
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-heading text-[34px] leading-tight">Opérations</h1>
          <div className="flex flex-wrap items-center gap-2.5">
            <MonthNav
              month={viewedMonth}
              min={firstMonth}
              max={activeMonth}
              buildHref={buildHref}
            />
            {budgetMonth?.status === "closed" ? (
              <>
                <Badge>Clôturé, lecture seule</Badge>
                {canReopen ? (
                  <Link
                    href={`/history/${formatMonth(viewedMonth)}`}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Rouvrir depuis l'historique
                  </Link>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
        {actions}
      </div>
    );
  }

  if (!budgetMonth) {
    return (
      <div className="flex flex-col gap-6">
        {renderHead()}
        {isSameMonth(viewedMonth, activeMonth) ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Ouvre {formatMonthLabel(viewedMonth)} pour saisir des opérations.
            </p>
            <Link href="/" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Ouvrir le mois
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune opération ce mois-là.</p>
        )}
      </div>
    );
  }

  const [
    expenses,
    contributions,
    reimbursements,
    extraIncomes,
    savingsTransfers,
    recentExpenses,
    categories,
    provisions,
    knownPlaces,
    lastUsedCategoryId,
  ] = await Promise.all([
    findExpensesByUserAndMonth(prisma, session.user.id, viewedMonth),
    findContributionsByUserAndMonth(prisma, session.user.id, viewedMonth),
    findReimbursementsByUserAndMonth(prisma, session.user.id, viewedMonth),
    findExtraIncomesByUserAndMonth(prisma, session.user.id, viewedMonth),
    findSavingsTransfersByUserAndMonth(prisma, session.user.id, viewedMonth),
    findRecentExpensesByUser(prisma, session.user.id, RECENT_EXPENSE_LINK_LIMIT),
    findCategoriesByUser(prisma, session.user.id),
    findProvisionsByUser(prisma, session.user.id),
    findKnownPlacesByUser(prisma, session.user.id),
    findLastUsedCategoryIdByUser(prisma, session.user.id),
  ]);

  // A category from an old link that no longer exists filters nothing, instead of hiding every row.
  const categoryId = categories.some((category) => category.id === requestedCategoryId)
    ? requestedCategoryId
    : "";
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const provisionLabels = new Map(
    budgetMonth.provisionTargets.map((entry) => [entry.provisionId, entry.label]),
  );
  const envelopeLabels = new Map(
    budgetMonth.envelopeBudgets.map((entry) => [entry.envelopeId, entry.label]),
  );

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
  const activeCategories = categories
    .filter((category) => !category.archived)
    .map((category) => ({ id: category.id, label: category.label }));
  const expenseOptions = toExpenseLinkOptions(recentExpenses);
  const categoryOf = (id: string) => {
    const category = categoriesById.get(id);
    return category ? { label: category.label, color: category.color } : undefined;
  };

  const items: OperationItem[] = [
    ...expenses.map((expense): OperationItem => {
      const targetLabel =
        expense.source.type === "envelope"
          ? (envelopeLabels.get(expense.source.envelopeId) ?? "")
          : (provisionLabels.get(expense.source.provisionId) ?? "");
      return {
        key: `expense-${expense.id}`,
        date: expense.date,
        kindOrder: 0,
        categoryId: expense.categoryId,
        searchText: [expense.place, expense.description, categoryOf(expense.categoryId)?.label]
          .filter(Boolean)
          .join(" "),
        row: (
          <ExpenseRow
            key={`expense-${expense.id}`}
            expense={expense}
            category={categoryOf(expense.categoryId)}
            targetLabel={targetLabel}
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
        ),
      };
    }),
    ...contributions.map(
      (contribution): OperationItem => ({
        key: `contribution-${contribution.id}`,
        date: contribution.date,
        kindOrder: 1,
        searchText: `Versement ${provisionLabels.get(contribution.provisionId) ?? ""}`,
        row: (
          <ContributionRow
            key={`contribution-${contribution.id}`}
            contribution={contribution}
            provisionLabel={provisionLabels.get(contribution.provisionId) ?? ""}
            provisions={provisionOptions}
            minDate={minDate}
            maxDate={maxDate}
            editable={editable}
          />
        ),
      }),
    ),
    ...reimbursements.map(
      (reimbursement): OperationItem => ({
        key: `reimbursement-${reimbursement.id}`,
        date: reimbursement.date,
        kindOrder: 2,
        categoryId: reimbursement.categoryId,
        searchText: `Remboursement ${reimbursement.label} ${categoryOf(reimbursement.categoryId)?.label ?? ""}`,
        row: (
          <ReimbursementRow
            key={`reimbursement-${reimbursement.id}`}
            reimbursement={reimbursement}
            category={categoryOf(reimbursement.categoryId)}
            categories={activeCategories}
            expenseOptions={expenseOptions}
            minDate={minDate}
            maxDate={maxDate}
            editable={editable}
          />
        ),
      }),
    ),
    ...extraIncomes.map(
      (extraIncome): OperationItem => ({
        key: `extra-income-${extraIncome.id}`,
        date: extraIncome.date,
        kindOrder: 3,
        searchText: `Entrée exceptionnelle ${extraIncome.label}`,
        row: (
          <ExtraIncomeRow
            key={`extra-income-${extraIncome.id}`}
            extraIncome={extraIncome}
            minDate={minDate}
            maxDate={maxDate}
            editable={editable}
          />
        ),
      }),
    ),
    ...savingsTransfers.map(
      (savingsTransfer): OperationItem => ({
        key: `savings-transfer-${savingsTransfer.id}`,
        date: savingsTransfer.date,
        kindOrder: 4,
        searchText: `Transfert épargne ${savingsTransfer.label ?? ""}`,
        row: (
          <SavingsTransferRow
            key={`savings-transfer-${savingsTransfer.id}`}
            savingsTransfer={savingsTransfer}
            minDate={minDate}
            maxDate={maxDate}
            editable={editable}
          />
        ),
      }),
    ),
  ];

  const qLower = q.toLowerCase();
  const visibleItems = items
    .filter((item) => !categoryId || item.categoryId === categoryId)
    .filter((item) => !qLower || item.searchText.toLowerCase().includes(qLower))
    .sort((a, b) => compareCalendarDates(a.date, b.date) || a.kindOrder - b.kindOrder);

  const filtering = Boolean(q || categoryId);
  const categoryLabel = categoryId ? categoriesById.get(categoryId)?.label : undefined;
  const noMatchMessage =
    q && categoryLabel
      ? `Aucune opération ne correspond à « ${q} » dans la catégorie ${categoryLabel}.`
      : q
        ? `Aucune opération ne correspond à « ${q} ».`
        : `Aucune opération dans la catégorie ${categoryLabel}.`;

  const totalOf = (amounts: { amount: Money }[]) => sumMoney(amounts.map((entry) => entry.amount));
  const totalSpent = totalOf(expenses);
  const totalTransferred = totalOf(savingsTransfers);
  // "Mis de côté" gathers what goes to provisions and what goes to savings (R37).
  const totalSetAside = sumMoney([totalOf(contributions), totalTransferred]);
  const totalReimbursed = totalOf(reimbursements);
  const totalExtraIncome = totalOf(extraIncomes);

  const activeProvisions = provisions.filter((provision) => provision.status !== "closed");
  const dialogs = editable ? (
    <AddOperationDialogs
      canAddExpense={
        activeCategories.length > 0 && (envelopeOptions.length > 0 || activeProvisions.length > 0)
      }
      canAddContribution={activeProvisions.length > 0}
      canAddReimbursement={activeCategories.length > 0}
      canAddExtraIncome
      canAddSavingsTransfer
      expenseOptions={expenseOptions}
      envelopes={envelopeOptions}
      provisions={activeProvisions.map((provision) => ({
        id: provision.id,
        label: provision.label,
      }))}
      categories={activeCategories}
      minDate={minDate}
      maxDate={maxDate}
      knownPlaces={knownPlaces}
      lastUsedCategoryId={lastUsedCategoryId}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      {renderHead(dialogs)}
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-[repeat(4,max-content)] md:gap-x-10">
        <Total label="Dépensé" amount={totalSpent} />
        <Total
          label="Mis de côté"
          amount={totalSetAside}
          note={
            totalTransferred.cents > 0
              ? `dont ${formatEuros(moneyToEuros(totalTransferred))} vers l'épargne`
              : undefined
          }
        />
        <Total label="Remboursé" amount={totalReimbursed} incoming />
        <Total label="Entrées exceptionnelles" amount={totalExtraIncome} incoming />
      </dl>
      <OperationsFilters
        month={formatMonth(viewedMonth)}
        q={q}
        categoryId={categoryId}
        categories={categories}
      />

      <div className="flex flex-col gap-2">
        <p role="status" className={filtering ? "text-sm text-muted-foreground" : "sr-only"}>
          {visibleItems.length} {visibleItems.length > 1 ? "opérations" : "opération"}
          {filtering ? ` sur ${items.length}` : ""}
        </p>
        <div className="overflow-hidden rounded-xl border bg-card">
          {visibleItems.length > 0 ? (
            <Table className="max-md:block md:[&_td]:px-3 md:[&_th]:px-3">
              <TableCaption className="sr-only">
                Opérations, {formatMonthLabel(viewedMonth)}
              </TableCaption>
              <TableHeader className="max-md:sr-only">
                <TableRow>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Imputé à</TableHead>
                  <TableHead className="text-muted-foreground">Lieu ou type</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Catégorie</TableHead>
                  <TableHead className="text-right text-muted-foreground">Montant</TableHead>
                  {editable ? <TableHead /> : null}
                </TableRow>
              </TableHeader>
              <TableBody className="max-md:block">{visibleItems.map((item) => item.row)}</TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-start gap-3 p-4">
              <p className="text-sm text-muted-foreground">
                {items.length > 0 ? (
                  noMatchMessage
                ) : editable ? (
                  <>
                    Aucune opération pour l'instant. Ajoute une dépense avec « Nouvelle dépense »
                    <span className="max-md:hidden">, ou avec la touche N</span>.
                  </>
                ) : (
                  "Aucune opération ce mois-là."
                )}
              </p>
              {items.length > 0 ? (
                <Link
                  href={`/operations?month=${formatMonth(viewedMonth)}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Effacer les filtres
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
