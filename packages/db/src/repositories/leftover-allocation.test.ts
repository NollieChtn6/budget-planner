import {
  type BudgetMonth,
  moneyFromEuros,
  moneyToEuros,
  parseCalendarDate,
  parseMonth,
} from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import { createFixedEntry } from "./fixed-entry";
import { findLeftoverAllocationsByUserAndMonth } from "./leftover-allocation";
import { closeBudgetMonth, createBudgetMonth, reopenBudgetMonth } from "./month";
import { createProvision } from "./provision";
import { createVariableEnvelope } from "./variable-envelope";

const prisma = createTestPrismaClient();

const primaryEmail = "leftover-allocation-repo-test@example.com";
const otherEmail = "leftover-allocation-repo-test-other@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [primaryEmail, otherEmail] } } });
}

function createTestUser(email: string) {
  return prisma.user.create({ data: { name: "Test", email, emailVerified: true } });
}

const month = parseMonth("2026-01");

async function seedOpenMonth(userId: string) {
  await createFixedEntry(prisma, userId, {
    label: "Loyer",
    type: "charge",
    firstVersion: { fixedEntryId: "pending", effectiveFrom: month, amount: moneyFromEuros(1000) },
  });
  await createVariableEnvelope(prisma, userId, {
    label: "Vie quotidienne",
    firstVersion: {
      envelopeId: "pending",
      effectiveFrom: month,
      mode: "amount",
      value: moneyFromEuros(150),
    },
  });
  const provision = await createProvision(prisma, userId, {
    type: "deadline",
    label: "Orthodontie",
    target: moneyFromEuros(400),
    startMonth: month,
    durationMonths: 6,
  });
  const budgetMonth: BudgetMonth = {
    month,
    status: "open",
    income: moneyFromEuros(2800),
    fixedEntries: [],
    envelopeBudgets: [],
    provisionTargets: [
      { provisionId: provision.id, label: "Orthodontie", target: moneyFromEuros(66.67) },
    ],
  };
  await createBudgetMonth(prisma, userId, budgetMonth);
  return { provision };
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("findLeftoverAllocationsByUserAndMonth", () => {
  it("returns every allocation ever recorded, across multiple closings", async () => {
    const user = await createTestUser(primaryEmail);
    const { provision } = await seedOpenMonth(user.id);

    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [
        { destination: "savings", amount: moneyFromEuros(20) },
        { destination: "provision", provisionId: provision.id, amount: moneyFromEuros(50) },
      ],
      contributions: [
        {
          date: parseCalendarDate("2026-01-31"),
          amount: moneyFromEuros(50),
          provisionId: provision.id,
          origin: "closing",
        },
      ],
    });
    await reopenBudgetMonth(prisma, user.id, month);
    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-02-01T09:00:00.000Z"),
      allocations: [{ destination: "savings", amount: moneyFromEuros(5) }],
      contributions: [],
    });

    const allocations = await findLeftoverAllocationsByUserAndMonth(prisma, user.id, month);
    expect(allocations).toHaveLength(3);
    const total = allocations.reduce((sum, a) => sum + moneyToEuros(a.amount), 0);
    expect(total).toBe(75);
  });

  it("only returns the requesting user's allocations", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);
    await seedOpenMonth(user.id);
    await seedOpenMonth(otherUser.id);

    await closeBudgetMonth(prisma, otherUser.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [{ destination: "savings", amount: moneyFromEuros(999) }],
      contributions: [],
    });

    const allocations = await findLeftoverAllocationsByUserAndMonth(prisma, user.id, month);
    expect(allocations).toHaveLength(0);
  });

  it("returns an empty list before any closing", async () => {
    const user = await createTestUser(primaryEmail);
    await seedOpenMonth(user.id);

    const allocations = await findLeftoverAllocationsByUserAndMonth(prisma, user.id, month);
    expect(allocations).toHaveLength(0);
  });
});
