import { moneyFromEuros, moneyToEuros, parseCalendarDate, parseMonth } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import { createCategory } from "./category";
import { createExpense, deleteExpense } from "./expense";
import {
  createReimbursement,
  deleteReimbursement,
  findReimbursementById,
  findReimbursementsByUserAndExpense,
  findReimbursementsByUserAndMonth,
  findReimbursementsForStats,
  updateReimbursement,
} from "./reimbursement";
import { createVariableEnvelope } from "./variable-envelope";

const prisma = createTestPrismaClient();

const primaryEmail = "reimbursement-repo-test@example.com";
const otherEmail = "reimbursement-repo-test-other@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [primaryEmail, otherEmail] } } });
}

function createTestUser(email: string) {
  return prisma.user.create({ data: { name: "Test", email, emailVerified: true } });
}

async function seedCategoryAndExpense(userId: string) {
  const envelope = await createVariableEnvelope(prisma, userId, {
    firstVersion: {
      envelopeId: "pending",
      effectiveFrom: parseMonth("2026-01"),
      label: "Vie quotidienne",
      mode: "amount",
      value: moneyFromEuros(150),
    },
  });
  const category = await createCategory(prisma, userId, { label: "Santé", color: "#4F46E5" });
  const expense = await createExpense(prisma, userId, {
    date: parseCalendarDate("2026-09-14"),
    amount: moneyFromEuros(60),
    categoryId: category.id,
    source: { type: "envelope", envelopeId: envelope.id },
  });
  return { category, expense };
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createReimbursement", () => {
  it("round-trips a reimbursement linked to an expense from an earlier month", async () => {
    const user = await createTestUser(primaryEmail);
    const { category, expense } = await seedCategoryAndExpense(user.id);

    const created = await createReimbursement(prisma, user.id, {
      date: parseCalendarDate("2026-10-12"),
      amount: moneyFromEuros(42),
      label: "Mutuelle",
      categoryId: category.id,
      expenseId: expense.id,
    });

    expect(moneyToEuros(created.amount)).toBe(42);
    expect(created.label).toBe("Mutuelle");
    expect(created.expenseId).toBe(expense.id);
  });

  it("accepts a reimbursement without a linked expense", async () => {
    const user = await createTestUser(primaryEmail);
    const { category } = await seedCategoryAndExpense(user.id);

    const created = await createReimbursement(prisma, user.id, {
      date: parseCalendarDate("2026-10-12"),
      amount: moneyFromEuros(42),
      label: "Sécu",
      categoryId: category.id,
    });

    expect(created.expenseId).toBeUndefined();
  });

  it("rejects a category belonging to another user", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const { category } = await seedCategoryAndExpense(owner.id);

    await expect(
      createReimbursement(prisma, attacker.id, {
        date: parseCalendarDate("2026-10-12"),
        amount: moneyFromEuros(42),
        label: "Mutuelle",
        categoryId: category.id,
      }),
    ).rejects.toThrow();
  });

  it("rejects an expense belonging to another user", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const { expense } = await seedCategoryAndExpense(owner.id);
    const attackerCategory = await createCategory(prisma, attacker.id, {
      label: "Santé",
      color: "#4F46E5",
    });

    await expect(
      createReimbursement(prisma, attacker.id, {
        date: parseCalendarDate("2026-10-12"),
        amount: moneyFromEuros(42),
        label: "Mutuelle",
        categoryId: attackerCategory.id,
        expenseId: expense.id,
      }),
    ).rejects.toThrow();
  });

  it("rejects a non-positive amount at the database level", async () => {
    const user = await createTestUser(primaryEmail);
    const { category } = await seedCategoryAndExpense(user.id);

    await expect(
      createReimbursement(prisma, user.id, {
        date: parseCalendarDate("2026-10-12"),
        amount: moneyFromEuros(0),
        label: "Mutuelle",
        categoryId: category.id,
      }),
    ).rejects.toThrow();
  });
});

describe("findReimbursementsByUserAndMonth", () => {
  it("returns only the user's reimbursements dated in the month (R35)", async () => {
    const user = await createTestUser(primaryEmail);
    const other = await createTestUser(otherEmail);
    const { category } = await seedCategoryAndExpense(user.id);
    const otherCategory = await createCategory(prisma, other.id, {
      label: "Santé",
      color: "#4F46E5",
    });
    const base = { label: "Mutuelle", categoryId: category.id, amount: moneyFromEuros(42) };

    await createReimbursement(prisma, user.id, { ...base, date: parseCalendarDate("2026-10-01") });
    await createReimbursement(prisma, user.id, { ...base, date: parseCalendarDate("2026-10-31") });
    await createReimbursement(prisma, user.id, { ...base, date: parseCalendarDate("2026-11-01") });
    await createReimbursement(prisma, other.id, {
      ...base,
      categoryId: otherCategory.id,
      date: parseCalendarDate("2026-10-15"),
    });

    const found = await findReimbursementsByUserAndMonth(prisma, user.id, parseMonth("2026-10"));
    expect(found).toHaveLength(2);
  });
});

describe("findReimbursementsByUserAndExpense", () => {
  it("returns every reimbursement linked to the expense", async () => {
    const user = await createTestUser(primaryEmail);
    const { category, expense } = await seedCategoryAndExpense(user.id);
    const base = {
      label: "Mutuelle",
      categoryId: category.id,
      amount: moneyFromEuros(20),
      expenseId: expense.id,
    };
    await createReimbursement(prisma, user.id, { ...base, date: parseCalendarDate("2026-10-01") });
    await createReimbursement(prisma, user.id, { ...base, date: parseCalendarDate("2026-11-03") });

    const found = await findReimbursementsByUserAndExpense(prisma, user.id, expense.id);
    expect(found).toHaveLength(2);
  });
});

describe("findReimbursementById", () => {
  it("does not return another user's reimbursement", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const { category } = await seedCategoryAndExpense(owner.id);
    const created = await createReimbursement(prisma, owner.id, {
      date: parseCalendarDate("2026-10-12"),
      amount: moneyFromEuros(42),
      label: "Mutuelle",
      categoryId: category.id,
    });

    expect(await findReimbursementById(prisma, attacker.id, created.id)).toBeNull();
  });
});

describe("updateReimbursement", () => {
  it("updates the amount and label", async () => {
    const user = await createTestUser(primaryEmail);
    const { category } = await seedCategoryAndExpense(user.id);
    const created = await createReimbursement(prisma, user.id, {
      date: parseCalendarDate("2026-10-12"),
      amount: moneyFromEuros(42),
      label: "Mutuelle",
      categoryId: category.id,
    });

    await updateReimbursement(prisma, user.id, created.id, {
      date: created.date,
      amount: moneyFromEuros(50),
      label: "Mutuelle + Sécu",
      categoryId: category.id,
    });

    const updated = await findReimbursementById(prisma, user.id, created.id);
    expect(updated && moneyToEuros(updated.amount)).toBe(50);
    expect(updated?.label).toBe("Mutuelle + Sécu");
  });

  it("cannot update another user's reimbursement", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const { category } = await seedCategoryAndExpense(owner.id);
    const attackerCategory = await createCategory(prisma, attacker.id, {
      label: "Santé",
      color: "#4F46E5",
    });
    const created = await createReimbursement(prisma, owner.id, {
      date: parseCalendarDate("2026-10-12"),
      amount: moneyFromEuros(42),
      label: "Mutuelle",
      categoryId: category.id,
    });

    await expect(
      updateReimbursement(prisma, attacker.id, created.id, {
        date: created.date,
        amount: moneyFromEuros(1),
        label: "Hack",
        categoryId: attackerCategory.id,
      }),
    ).rejects.toThrow();
  });
});

describe("deleteReimbursement", () => {
  it("deletes the user's reimbursement", async () => {
    const user = await createTestUser(primaryEmail);
    const { category } = await seedCategoryAndExpense(user.id);
    const created = await createReimbursement(prisma, user.id, {
      date: parseCalendarDate("2026-10-12"),
      amount: moneyFromEuros(42),
      label: "Mutuelle",
      categoryId: category.id,
    });

    await deleteReimbursement(prisma, user.id, created.id);
    expect(await findReimbursementById(prisma, user.id, created.id)).toBeNull();
  });

  it("cannot delete another user's reimbursement", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const { category } = await seedCategoryAndExpense(owner.id);
    const created = await createReimbursement(prisma, owner.id, {
      date: parseCalendarDate("2026-10-12"),
      amount: moneyFromEuros(42),
      label: "Mutuelle",
      categoryId: category.id,
    });

    await expect(deleteReimbursement(prisma, attacker.id, created.id)).rejects.toThrow();
  });
});

describe("deleting the linked expense", () => {
  it("detaches the reimbursement instead of deleting it", async () => {
    const user = await createTestUser(primaryEmail);
    const { category, expense } = await seedCategoryAndExpense(user.id);
    const created = await createReimbursement(prisma, user.id, {
      date: parseCalendarDate("2026-10-12"),
      amount: moneyFromEuros(42),
      label: "Mutuelle",
      categoryId: category.id,
      expenseId: expense.id,
    });

    await deleteExpense(prisma, user.id, expense.id);

    const kept = await findReimbursementById(prisma, user.id, created.id);
    expect(kept).not.toBeNull();
    expect(kept?.expenseId).toBeUndefined();
  });
});

describe("findReimbursementsForStats", () => {
  it("returns reimbursements linked to the given expenses plus unlinked ones in the range, for this user only", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);
    const { category, expense } = await seedCategoryAndExpense(user.id);
    const otherSetup = await seedCategoryAndExpense(otherUser.id);

    const make = (date: string, euros: number, expenseId?: string) =>
      createReimbursement(prisma, user.id, {
        date: parseCalendarDate(date),
        amount: moneyFromEuros(euros),
        label: "Mutuelle",
        categoryId: category.id,
        ...(expenseId ? { expenseId } : {}),
      });
    await make("2026-12-20", 1, expense.id); // linked, received after the range
    await make("2026-09-20", 2); // unlinked, in the range
    await make("2026-08-31", 3); // unlinked, before the range
    await make("2026-11-01", 4); // unlinked, after the range
    await createReimbursement(prisma, otherUser.id, {
      date: parseCalendarDate("2026-09-20"),
      amount: moneyFromEuros(99),
      label: "Mutuelle",
      categoryId: otherSetup.category.id,
      expenseId: otherSetup.expense.id,
    });

    const reimbursements = await findReimbursementsForStats(
      prisma,
      user.id,
      parseMonth("2026-09"),
      parseMonth("2026-10"),
      [expense.id],
    );
    expect(reimbursements.map((r) => moneyToEuros(r.amount)).sort()).toEqual([1, 2]);
  });
});
