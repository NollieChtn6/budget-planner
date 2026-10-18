import {
  closeBudgetMonth,
  createBudgetMonth,
  createFixedEntry,
  createProvision,
  createTestPrismaClient,
  createVariableEnvelope,
} from "@budget/db";
import { type BudgetMonth, moneyFromEuros, nextMonth, parseMonth } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveActiveMonth, resolveCurrentMonth } from "./current-month";

const prisma = createTestPrismaClient();

const primaryEmail = "active-month-test@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: primaryEmail } });
}

function createTestUser() {
  return prisma.user.create({ data: { name: "Test", email: primaryEmail, emailVerified: true } });
}

const month = parseMonth("2026-01");

async function seedParameterization(userId: string) {
  const fixedEntry = await createFixedEntry(prisma, userId, {
    type: "charge",
    firstVersion: {
      fixedEntryId: "pending",
      effectiveFrom: month,
      label: "Loyer",
      amount: moneyFromEuros(1000),
    },
  });
  const envelope = await createVariableEnvelope(prisma, userId, {
    firstVersion: {
      envelopeId: "pending",
      effectiveFrom: month,
      label: "Vie quotidienne",
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
  return { fixedEntry, envelope, provision };
}

function buildBudgetMonth(
  seed: Awaited<ReturnType<typeof seedParameterization>>,
  overrides?: Partial<BudgetMonth>,
): BudgetMonth {
  return {
    month,
    status: "open",
    income: moneyFromEuros(2800),
    fixedEntries: [
      {
        fixedEntryId: seed.fixedEntry.id,
        label: "Loyer",
        type: "charge",
        amount: moneyFromEuros(1000),
        status: "planned",
      },
    ],
    envelopeBudgets: [
      {
        envelopeId: seed.envelope.id,
        label: "Vie quotidienne",
        mode: "amount",
        value: moneyFromEuros(150),
        budget: moneyFromEuros(150),
      },
    ],
    provisionTargets: [
      { provisionId: seed.provision.id, label: "Orthodontie", target: moneyFromEuros(66.67) },
    ],
    ...overrides,
  };
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("resolveActiveMonth", () => {
  it("falls back to the real calendar month when the account has no month yet", async () => {
    const user = await createTestUser();
    const active = await resolveActiveMonth(prisma, user.id);
    expect(active).toEqual(resolveCurrentMonth());
  });

  it("returns the open month, independent from the calendar month", async () => {
    const user = await createTestUser();
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    const active = await resolveActiveMonth(prisma, user.id);
    expect(active).toEqual(month);
  });

  it("returns the month after the last closed one once it has no open month", async () => {
    const user = await createTestUser();
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });

    const active = await resolveActiveMonth(prisma, user.id);
    expect(active).toEqual(nextMonth(month));
  });

  it("only considers the requesting user's months", async () => {
    const user = await createTestUser();
    const other = await prisma.user.create({
      data: { name: "Other", email: "active-month-test-other@example.com", emailVerified: true },
    });
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    const active = await resolveActiveMonth(prisma, other.id);
    expect(active).toEqual(resolveCurrentMonth());

    await prisma.user.delete({ where: { id: other.id } });
  });
});
