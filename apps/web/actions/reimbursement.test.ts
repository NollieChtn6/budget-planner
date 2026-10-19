import {
  createCategory,
  createExpense,
  createReimbursement,
  createTestPrismaClient,
  createVariableEnvelope,
  findReimbursementsByUserAndMonth,
} from "@budget/db";
import { moneyFromEuros, moneyToCents, parseCalendarDate } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveCurrentMonth } from "../lib/current-month";
import { openMonthForUser } from "./month";
import {
  createReimbursementForUser,
  deleteReimbursementForUser,
  updateReimbursementForUser,
} from "./reimbursement";

const prisma = createTestPrismaClient();

const primaryEmail = "reimbursement-action-test@example.com";
const otherEmail = "reimbursement-action-test-other@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [primaryEmail, otherEmail] } } });
}

function createTestUser(email = primaryEmail) {
  return prisma.user.create({ data: { name: "Test", email, emailVerified: true } });
}

const currentMonth = resolveCurrentMonth();
const today = `${currentMonth.year.toString().padStart(4, "0")}-${currentMonth.monthNumber
  .toString()
  .padStart(2, "0")}-05`;

async function seedOpenMonth(userId: string) {
  const envelope = await createVariableEnvelope(prisma, userId, {
    firstVersion: {
      envelopeId: "pending",
      effectiveFrom: currentMonth,
      label: "Vie quotidienne",
      mode: "amount",
      value: moneyFromEuros(150),
    },
  });
  const category = await createCategory(prisma, userId, { label: "Santé", color: "#4F46E5" });
  // The reimbursed expense is paid in an earlier month (E17): the link is
  // informative, so it may point to any month.
  const expense = await createExpense(prisma, userId, {
    date: parseCalendarDate("2020-01-14"),
    amount: moneyFromEuros(60),
    categoryId: category.id,
    source: { type: "envelope", envelopeId: envelope.id },
  });
  await openMonthForUser(prisma, userId, 2800);
  return { category, expense };
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createReimbursementForUser", () => {
  it("records a reimbursement linked to an expense paid in an earlier month (R35)", async () => {
    const user = await createTestUser();
    const { category, expense } = await seedOpenMonth(user.id);

    const result = await createReimbursementForUser(prisma, user.id, {
      amountEuros: 42,
      date: today,
      label: "Mutuelle",
      categoryId: category.id,
      expenseId: expense.id,
    });

    expect(result).toEqual({ status: "success", message: "Remboursement enregistré." });
    const saved = await findReimbursementsByUserAndMonth(prisma, user.id, currentMonth);
    expect(saved).toHaveLength(1);
    expect(moneyToCents(saved[0]?.amount ?? moneyFromEuros(-1))).toBe(4200);
    expect(saved[0]?.expenseId).toBe(expense.id);
  });

  it("rejects a reimbursement when the month isn't open", async () => {
    const user = await createTestUser();
    const category = await createCategory(prisma, user.id, { label: "Santé", color: "#4F46E5" });

    const result = await createReimbursementForUser(prisma, user.id, {
      amountEuros: 42,
      date: today,
      label: "Mutuelle",
      categoryId: category.id,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("ouvert");
  });

  it("rejects a date of receipt outside the active month", async () => {
    const user = await createTestUser();
    const { category } = await seedOpenMonth(user.id);

    const result = await createReimbursementForUser(prisma, user.id, {
      amountEuros: 42,
      date: "2020-01-14",
      label: "Mutuelle",
      categoryId: category.id,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("mois en cours");
  });

  it("rejects an expense belonging to another user", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser(otherEmail);
    const { expense } = await seedOpenMonth(owner.id);
    const attackerCategory = await createCategory(prisma, attacker.id, {
      label: "Santé",
      color: "#4F46E5",
    });
    await openMonthForUser(prisma, attacker.id, 2800);

    const result = await createReimbursementForUser(prisma, attacker.id, {
      amountEuros: 42,
      date: today,
      label: "Mutuelle",
      categoryId: attackerCategory.id,
      expenseId: expense.id,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("introuvable");
  });

  it("warns without blocking when the linked reimbursements exceed the expense (R35)", async () => {
    const user = await createTestUser();
    const { category, expense } = await seedOpenMonth(user.id);
    await createReimbursement(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(40),
      label: "Mutuelle",
      categoryId: category.id,
      expenseId: expense.id,
    });

    const result = await createReimbursementForUser(prisma, user.id, {
      amountEuros: 40,
      date: today,
      label: "Sécu",
      categoryId: category.id,
      expenseId: expense.id,
    });

    expect(result.status).toBe("success");
    expect(result.warning).toContain("dépassent");
    expect(await findReimbursementsByUserAndMonth(prisma, user.id, currentMonth)).toHaveLength(2);
  });
});

describe("updateReimbursementForUser", () => {
  it("revises a reimbursement without counting it twice in the warning", async () => {
    const user = await createTestUser();
    const { category, expense } = await seedOpenMonth(user.id);
    const reimbursement = await createReimbursement(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(40),
      label: "Mutuelle",
      categoryId: category.id,
      expenseId: expense.id,
    });

    const result = await updateReimbursementForUser(prisma, user.id, {
      id: reimbursement.id,
      amountEuros: 55,
      date: today,
      label: "Mutuelle",
      categoryId: category.id,
      expenseId: expense.id,
    });

    expect(result).toEqual({ status: "success", message: "Remboursement modifié." });
    const saved = await findReimbursementsByUserAndMonth(prisma, user.id, currentMonth);
    expect(moneyToCents(saved[0]?.amount ?? moneyFromEuros(-1))).toBe(5500);
  });

  it("cannot revise another user's reimbursement", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser(otherEmail);
    const { category } = await seedOpenMonth(owner.id);
    const attackerCategory = await createCategory(prisma, attacker.id, {
      label: "Santé",
      color: "#4F46E5",
    });
    await openMonthForUser(prisma, attacker.id, 2800);
    const reimbursement = await createReimbursement(prisma, owner.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(40),
      label: "Mutuelle",
      categoryId: category.id,
    });

    const result = await updateReimbursementForUser(prisma, attacker.id, {
      id: reimbursement.id,
      amountEuros: 1,
      date: today,
      label: "Hack",
      categoryId: attackerCategory.id,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("introuvable");
  });
});

describe("deleteReimbursementForUser", () => {
  it("deletes a reimbursement of the active month", async () => {
    const user = await createTestUser();
    const { category } = await seedOpenMonth(user.id);
    const reimbursement = await createReimbursement(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(40),
      label: "Mutuelle",
      categoryId: category.id,
    });

    const result = await deleteReimbursementForUser(prisma, user.id, reimbursement.id);

    expect(result.status).toBe("success");
    expect(await findReimbursementsByUserAndMonth(prisma, user.id, currentMonth)).toHaveLength(0);
  });

  it("cannot delete another user's reimbursement", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser(otherEmail);
    const { category } = await seedOpenMonth(owner.id);
    await openMonthForUser(prisma, attacker.id, 2800);
    const reimbursement = await createReimbursement(prisma, owner.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(40),
      label: "Mutuelle",
      categoryId: category.id,
    });

    const result = await deleteReimbursementForUser(prisma, attacker.id, reimbursement.id);

    expect(result.status).toBe("error");
    expect(await findReimbursementsByUserAndMonth(prisma, owner.id, currentMonth)).toHaveLength(1);
  });
});
