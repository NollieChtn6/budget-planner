import {
  createFixedEntry,
  createProvision,
  createTestPrismaClient,
  createVariableEnvelope,
  findBudgetMonthByMonth,
} from "@budget/db";
import { moneyFromEuros, moneyToCents } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveCurrentMonth } from "../lib/current-month";
import { openMonthForUser } from "./month";

const prisma = createTestPrismaClient();

const primaryEmail = "month-action-test@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: primaryEmail } });
}

function createTestUser() {
  return prisma.user.create({ data: { name: "Test", email: primaryEmail, emailVerified: true } });
}

const currentMonth = resolveCurrentMonth();

async function seedParameterization(userId: string) {
  await createFixedEntry(prisma, userId, {
    label: "Loyer",
    type: "charge",
    firstVersion: {
      fixedEntryId: "pending",
      effectiveFrom: currentMonth,
      amount: moneyFromEuros(1000),
    },
  });
  await createVariableEnvelope(prisma, userId, {
    label: "Vie quotidienne",
    firstVersion: {
      envelopeId: "pending",
      effectiveFrom: currentMonth,
      mode: "amount",
      value: moneyFromEuros(150),
    },
  });
  await createProvision(prisma, userId, {
    type: "reserve",
    label: "Imprévus",
    target: moneyFromEuros(250),
    monthlyAmount: moneyFromEuros(50),
  });
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("openMonthForUser", () => {
  it("opens the current month and freezes the snapshot from real parameterization", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);

    const result = await openMonthForUser(prisma, user.id, 2800);
    expect(result.status).toBe("success");

    const budgetMonth = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    expect(budgetMonth).not.toBeNull();
    expect(budgetMonth?.status).toBe("open");
    expect(moneyToCents(budgetMonth?.income ?? moneyFromEuros(-1))).toBe(
      moneyToCents(moneyFromEuros(2800)),
    );
    expect(budgetMonth?.fixedEntries).toHaveLength(1);
    expect(budgetMonth?.envelopeBudgets).toHaveLength(1);
    expect(budgetMonth?.provisionTargets).toHaveLength(1);
  });

  it("rejects opening the same month twice", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);

    await openMonthForUser(prisma, user.id, 2800);
    const second = await openMonthForUser(prisma, user.id, 2800);

    expect(second.status).toBe("error");
    expect(second.message).toContain("déjà ouvert");
  });

  it("rejects an invalid income before touching the domain", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);

    const result = await openMonthForUser(prisma, user.id, 12.345);

    expect(result.status).toBe("error");
    const budgetMonth = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    expect(budgetMonth).toBeNull();
  });
});
