import { describe, expect, it } from "vitest";
import type { Category } from "../budget/category";
import { parseCalendarDate } from "../calendar-date";
import { moneyFromCents, moneyFromEuros, moneyToCents } from "../money";
import { parseMonth } from "../month";
import { computeCategoryStats, selectStatsMonths } from "./category-stats";
import type { Expense } from "./expense";
import type { Reimbursement } from "./reimbursement";

function category(id: string, overrides: Partial<Category> = {}): Category {
  return { id, label: id, color: "#336699", archived: false, ...overrides };
}

function expense(id: string, date: string, euros: number, categoryId: string): Expense {
  return {
    id,
    date: parseCalendarDate(date),
    amount: moneyFromEuros(euros),
    categoryId,
    source: { type: "envelope", envelopeId: "env" },
  };
}

function reimbursement(
  id: string,
  date: string,
  euros: number,
  categoryId: string,
  expenseId?: string,
): Reimbursement {
  return {
    id,
    date: parseCalendarDate(date),
    amount: moneyFromEuros(euros),
    label: "Mutuelle",
    categoryId,
    ...(expenseId ? { expenseId } : {}),
  };
}

describe("selectStatsMonths", () => {
  const closed = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09"].map(parseMonth);
  const active = parseMonth("2026-10");

  it("takes the latest existing months in chronological order, active month included", () => {
    expect(selectStatsMonths(closed, active, { length: 3, includeActiveMonth: true })).toEqual(
      ["2026-08", "2026-09", "2026-10"].map(parseMonth),
    );
  });

  it("leaves the active month out when asked", () => {
    expect(selectStatsMonths(closed, active, { length: 3, includeActiveMonth: false })).toEqual(
      ["2026-07", "2026-08", "2026-09"].map(parseMonth),
    );
  });

  it("takes what exists when fewer months than requested exist", () => {
    expect(
      selectStatsMonths(closed.slice(-2), undefined, { length: 12, includeActiveMonth: true }),
    ).toEqual(["2026-08", "2026-09"].map(parseMonth));
  });

  it("takes every month for 'all'", () => {
    expect(
      selectStatsMonths(closed, active, { length: "all", includeActiveMonth: true }),
    ).toHaveLength(6);
  });
});

describe("computeCategoryStats", () => {
  const categories = [
    category("sante"),
    category("entretien"),
    category("autres"),
    category("vieille", { archived: true }),
    category("vide"),
  ];
  const september = [parseMonth("2026-09")];

  it("deducts a linked reimbursement from its expense, provision expenses included (E20)", () => {
    const provisionExpense: Expense = {
      ...expense("e2", "2026-09-10", 20, "sante"),
      source: { type: "provision", provisionId: "ortho" },
    };
    const stats = computeCategoryStats({
      categories,
      expenses: [expense("e1", "2026-09-03", 50, "sante"), provisionExpense],
      reimbursements: [reimbursement("r1", "2026-09-20", 42, "sante", "e1")],
      months: september,
    });

    const [sante] = stats.rows;
    expect(sante && moneyToCents(sante.net)).toBe(2800);
    expect(sante && moneyToCents(sante.gross)).toBe(7000);
    expect(sante && moneyToCents(sante.reimbursed)).toBe(4200);
  });

  it("caps a linked reimbursement at its expense's amount", () => {
    const stats = computeCategoryStats({
      categories,
      expenses: [
        expense("e1", "2026-09-03", 40, "sante"),
        expense("e2", "2026-09-04", 10, "sante"),
      ],
      reimbursements: [reimbursement("r1", "2026-09-20", 55, "sante", "e1")],
      months: september,
    });
    expect(moneyToCents(stats.rows[0]?.net ?? moneyFromCents(0))).toBe(1000);
  });

  it("deducts a linked reimbursement received after the period from the expense's month", () => {
    const stats = computeCategoryStats({
      categories,
      expenses: [expense("e1", "2026-09-03", 40, "sante")],
      reimbursements: [reimbursement("r1", "2026-11-05", 30, "sante", "e1")],
      months: september,
    });
    expect(moneyToCents(stats.rows[0]?.net ?? moneyFromCents(0))).toBe(1000);
  });

  it("ignores a linked reimbursement whose expense is outside the period", () => {
    const stats = computeCategoryStats({
      categories,
      expenses: [
        expense("e1", "2026-08-03", 40, "sante"),
        expense("e2", "2026-09-03", 25, "sante"),
      ],
      reimbursements: [reimbursement("r1", "2026-09-20", 30, "sante", "e1")],
      months: september,
    });
    expect(moneyToCents(stats.rows[0]?.net ?? moneyFromCents(0))).toBe(2500);
  });

  it("deducts an unlinked reimbursement from its own category, never below zero (E22)", () => {
    const stats = computeCategoryStats({
      categories,
      expenses: [
        expense("e1", "2026-09-03", 10, "sante"),
        expense("e2", "2026-09-04", 30, "autres"),
      ],
      reimbursements: [reimbursement("r1", "2026-09-20", 42, "sante")],
      months: september,
    });
    expect(stats.rows.map((row) => row.category.id)).toEqual(["autres"]);
    expect(moneyToCents(stats.total)).toBe(3000);
  });

  it("ignores an unlinked reimbursement received outside the period", () => {
    const stats = computeCategoryStats({
      categories,
      expenses: [expense("e1", "2026-09-03", 40, "sante")],
      reimbursements: [reimbursement("r1", "2026-10-02", 30, "sante")],
      months: september,
    });
    expect(moneyToCents(stats.rows[0]?.net ?? moneyFromCents(0))).toBe(4000);
  });

  it("covers the period with and without the active month (E21)", () => {
    const expenses = [
      expense("a", "2026-07-05", 40, "entretien"),
      expense("b", "2026-08-05", 20, "entretien"),
      expense("c", "2026-10-05", 10, "entretien"),
      expense("d", "2026-07-06", 130, "autres"),
    ];
    const [july, august, october] = ["2026-07", "2026-08", "2026-10"].map(parseMonth);
    if (!(july && august && october)) throw new Error("unreachable");

    const withActive = computeCategoryStats({
      categories,
      expenses,
      reimbursements: [],
      months: [july, august, october],
    });
    const entretienWith = withActive.rows.find((row) => row.category.id === "entretien");
    expect(moneyToCents(withActive.total)).toBe(20_000);
    expect(entretienWith && moneyToCents(entretienWith.net)).toBe(7000);
    expect(entretienWith?.share).toBeCloseTo(35);
    expect(entretienWith && moneyToCents(entretienWith.monthlyAverage)).toBe(2333);

    const withoutActive = computeCategoryStats({
      categories,
      expenses,
      reimbursements: [],
      months: [july, august],
    });
    const entretienWithout = withoutActive.rows.find((row) => row.category.id === "entretien");
    expect(entretienWithout && moneyToCents(entretienWithout.net)).toBe(6000);
    expect(entretienWithout && moneyToCents(entretienWithout.monthlyAverage)).toBe(3000);
  });

  it("ignores expenses outside the period", () => {
    const stats = computeCategoryStats({
      categories,
      expenses: [expense("a", "2026-06-05", 40, "entretien")],
      reimbursements: [],
      months: september,
    });
    expect(stats.rows).toEqual([]);
    expect(stats.total).toEqual(moneyFromCents(0));
  });

  it("hides categories without spending, keeps archived ones, sorts by net descending", () => {
    const stats = computeCategoryStats({
      categories,
      expenses: [
        expense("a", "2026-09-01", 10, "entretien"),
        expense("b", "2026-09-02", 50, "vieille"),
        expense("c", "2026-09-03", 30, "autres"),
      ],
      reimbursements: [],
      months: september,
    });
    expect(stats.rows.map((row) => row.category.id)).toEqual(["vieille", "autres", "entretien"]);
  });
});
