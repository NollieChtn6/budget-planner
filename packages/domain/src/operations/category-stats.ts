import type { Category } from "../budget/category";
import { monthOfCalendarDate } from "../calendar-date";
import { addMoney, type Money, moneyFromCents, moneyToCents, sumMoney } from "../money";
import { compareMonths, formatMonth, type Month } from "../month";
import type { Expense } from "./expense";
import type { Reimbursement } from "./reimbursement";

/** R39: how many of the latest existing budget months to analyse. */
export type StatsPeriodLength = 3 | 6 | 12 | "all";

export type StatsPeriod = {
  length: StatsPeriodLength;
  includeActiveMonth: boolean;
};

/**
 * R39: the months of a period are existing budget months only (a never-opened
 * month has no operations and is neither counted nor shown). `closedMonths` and
 * `activeMonth` come from the caller; the result is in chronological order.
 */
export function selectStatsMonths(
  closedMonths: Month[],
  activeMonth: Month | undefined,
  period: StatsPeriod,
): Month[] {
  const existing = [
    ...closedMonths,
    ...(period.includeActiveMonth && activeMonth ? [activeMonth] : []),
  ].sort(compareMonths);
  return period.length === "all" ? existing : existing.slice(-period.length);
}

export type CategoryStatsRow = {
  category: Category;
  /** What was really spent: `gross` minus `reimbursed`, never negative. */
  net: Money;
  gross: Money;
  reimbursed: Money;
  /** Percentage of the period's net total. */
  share: number;
  monthlyAverage: Money;
};

export type CategoryStats = {
  rows: CategoryStatsRow[];
  total: Money;
  monthCount: number;
};

/**
 * R39: net spending per category over `months`, sorted by net descending.
 * Expenses on envelopes and on provisions both count.
 *
 * A reimbursement linked to an expense is deducted from that expense (its
 * category and month, wherever the reimbursement was received), up to the
 * expense's amount. An unlinked one is deducted from its own category when
 * received in the period; a category never goes below zero. `reimbursements`
 * may hold more than the period needs: the caller fetches those linked to the
 * period's expenses and the unlinked ones, and the rest is ignored here.
 * Categories with a zero net are left out.
 */
export function computeCategoryStats(input: {
  categories: Category[];
  expenses: Expense[];
  reimbursements: Reimbursement[];
  months: Month[];
}): CategoryStats {
  const monthKeys = new Set(input.months.map(formatMonth));
  const inPeriod = (item: { date: Expense["date"] }) =>
    monthKeys.has(formatMonth(monthOfCalendarDate(item.date)));

  const expenses = input.expenses.filter(inPeriod);
  const unlinked = input.reimbursements.filter((r) => r.expenseId === undefined && inPeriod(r));
  const monthCount = input.months.length;

  const spent = input.categories.flatMap((category) => {
    const categoryExpenses = expenses.filter((expense) => expense.categoryId === category.id);
    const gross = sumMoney(categoryExpenses.map((expense) => expense.amount));
    const linkedReimbursed = categoryExpenses.reduce((sum, expense) => {
      const received = sumMoney(
        input.reimbursements.filter((r) => r.expenseId === expense.id).map((r) => r.amount),
      );
      return sum + Math.min(moneyToCents(received), moneyToCents(expense.amount));
    }, 0);
    const unlinkedReimbursed = moneyToCents(
      sumMoney(unlinked.filter((r) => r.categoryId === category.id).map((r) => r.amount)),
    );
    const net = Math.max(0, moneyToCents(gross) - linkedReimbursed - unlinkedReimbursed);
    if (net === 0) return [];
    return [
      {
        category,
        net: moneyFromCents(net),
        gross,
        reimbursed: moneyFromCents(moneyToCents(gross) - net),
      },
    ];
  });

  const total = spent.reduce((sum, row) => addMoney(sum, row.net), moneyFromCents(0));
  const totalCents = moneyToCents(total);

  return {
    rows: spent
      .sort((a, b) => moneyToCents(b.net) - moneyToCents(a.net))
      .map((row) => ({
        ...row,
        share: (moneyToCents(row.net) / totalCents) * 100,
        monthlyAverage: moneyFromCents(Math.round(moneyToCents(row.net) / monthCount)),
      })),
    total,
    monthCount,
  };
}
