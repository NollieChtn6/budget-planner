import {
  createCategory,
  createContribution,
  createProvision,
  createTestPrismaClient,
  createVariableEnvelope,
  findExpensesByUserAndMonth,
} from "@budget/db";
import { moneyFromEuros, moneyToCents, moneyToEuros, parseCalendarDate } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveCurrentMonth } from "../lib/current-month";
import { createExpenseForUser } from "./expense";
import { openMonthForUser } from "./month";

const prisma = createTestPrismaClient();

const primaryEmail = "expense-action-test@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: primaryEmail } });
}

function createTestUser() {
  return prisma.user.create({ data: { name: "Test", email: primaryEmail, emailVerified: true } });
}

const currentMonth = resolveCurrentMonth();
const today = `${currentMonth.year.toString().padStart(4, "0")}-${currentMonth.monthNumber
  .toString()
  .padStart(2, "0")}-05`;

async function seedOpenMonth(userId: string) {
  const envelope = await createVariableEnvelope(prisma, userId, {
    label: "Vie quotidienne",
    firstVersion: {
      envelopeId: "pending",
      effectiveFrom: currentMonth,
      mode: "amount",
      value: moneyFromEuros(150),
    },
  });
  const provision = await createProvision(prisma, userId, {
    type: "reserve",
    label: "Imprévus",
    target: moneyFromEuros(250),
    monthlyAmount: moneyFromEuros(50),
  });
  const category = await createCategory(prisma, userId, { label: "Courses" });
  await openMonthForUser(prisma, userId, 2800);
  return { envelope, provision, category };
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createExpenseForUser — envelope target", () => {
  it("records an expense imputed to a budgeted envelope", async () => {
    const user = await createTestUser();
    const { envelope, category } = await seedOpenMonth(user.id);

    const result = await createExpenseForUser(prisma, user.id, {
      amountEuros: 15,
      date: today,
      categoryId: category.id,
      target: `envelope:${envelope.id}`,
      place: "Monoprix",
    });

    expect(result.status).toBe("success");
    const expenses = await findExpensesByUserAndMonth(prisma, user.id, currentMonth);
    expect(expenses).toHaveLength(1);
    expect(moneyToCents(expenses[0]?.amount ?? moneyFromEuros(-1))).toBe(1500);
    expect(expenses[0]?.place).toBe("Monoprix");
  });

  it("rejects an expense when the month isn't open", async () => {
    const user = await createTestUser();
    const envelope = await createVariableEnvelope(prisma, user.id, {
      label: "Vie quotidienne",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: currentMonth,
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });
    const category = await createCategory(prisma, user.id, { label: "Courses" });

    const result = await createExpenseForUser(prisma, user.id, {
      amountEuros: 15,
      date: today,
      categoryId: category.id,
      target: `envelope:${envelope.id}`,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("ouvert");
  });

  it("rejects a zero amount", async () => {
    const user = await createTestUser();
    const { envelope, category } = await seedOpenMonth(user.id);

    const result = await createExpenseForUser(prisma, user.id, {
      amountEuros: 0,
      date: today,
      categoryId: category.id,
      target: `envelope:${envelope.id}`,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("supérieur à 0");
  });

  it("rejects an archived category", async () => {
    const user = await createTestUser();
    const { envelope, category } = await seedOpenMonth(user.id);
    await prisma.category.update({ where: { id: category.id }, data: { archived: true } });

    const result = await createExpenseForUser(prisma, user.id, {
      amountEuros: 15,
      date: today,
      categoryId: category.id,
      target: `envelope:${envelope.id}`,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("archivée");
  });

  it("rejects an envelope outside this month's snapshot", async () => {
    const user = await createTestUser();
    const { category } = await seedOpenMonth(user.id);
    const otherEnvelope = await createVariableEnvelope(prisma, user.id, {
      label: "Ajoutée après ouverture",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: currentMonth,
        mode: "amount",
        value: moneyFromEuros(50),
      },
    });

    const result = await createExpenseForUser(prisma, user.id, {
      amountEuros: 15,
      date: today,
      categoryId: category.id,
      target: `envelope:${otherEnvelope.id}`,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("budget de ce mois");
  });
});

describe("createExpenseForUser — provision target (R22)", () => {
  it("records an expense within the provision's balance, with no savings draw", async () => {
    const user = await createTestUser();
    const { provision, category } = await seedOpenMonth(user.id);
    await createContribution(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(250),
      provisionId: provision.id,
      origin: "manual",
    });

    const result = await createExpenseForUser(prisma, user.id, {
      amountEuros: 100,
      date: today,
      categoryId: category.id,
      target: `provision:${provision.id}`,
    });

    expect(result.status).toBe("success");
    const expenses = await findExpensesByUserAndMonth(prisma, user.id, currentMonth);
    const provisionExpense = expenses.find((e) => e.source.type === "provision");
    expect(provisionExpense?.savingsDraw).toBeUndefined();
  });

  it("E10: draws 50€ from savings when a 300€ expense exceeds a 250€ balance", async () => {
    const user = await createTestUser();
    const { provision, category } = await seedOpenMonth(user.id);
    await createContribution(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(250),
      provisionId: provision.id,
      origin: "manual",
    });

    const result = await createExpenseForUser(prisma, user.id, {
      amountEuros: 300,
      date: today,
      categoryId: category.id,
      target: `provision:${provision.id}`,
    });

    expect(result.status).toBe("success");
    const expenses = await findExpensesByUserAndMonth(prisma, user.id, currentMonth);
    const provisionExpense = expenses.find((e) => e.source.type === "provision");
    expect(moneyToEuros(provisionExpense?.savingsDraw ?? moneyFromEuros(-1))).toBe(50);
  });

  it("rejects a provision outside this month's snapshot", async () => {
    const user = await createTestUser();
    const { category } = await seedOpenMonth(user.id);
    const otherProvision = await createProvision(prisma, user.id, {
      type: "reserve",
      label: "Ajoutée après ouverture",
      target: moneyFromEuros(100),
      monthlyAmount: moneyFromEuros(20),
    });

    const result = await createExpenseForUser(prisma, user.id, {
      amountEuros: 15,
      date: today,
      categoryId: category.id,
      target: `provision:${otherProvision.id}`,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("budget de ce mois");
  });
});

describe("createExpenseForUser — malformed target", () => {
  it("rejects a target that isn't envelope: or provision:", async () => {
    const user = await createTestUser();
    const { category } = await seedOpenMonth(user.id);

    const result = await createExpenseForUser(prisma, user.id, {
      amountEuros: 15,
      date: today,
      categoryId: category.id,
      target: "unknown:123",
    });

    expect(result.status).toBe("error");
  });
});
