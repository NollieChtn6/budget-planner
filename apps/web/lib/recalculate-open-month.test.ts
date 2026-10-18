import {
  createFixedEntry,
  createTestPrismaClient,
  createVariableEnvelope,
  findBudgetMonthByMonth,
  findFixedEntryById,
  persistFixedEntryVersion,
  setFixedEntryArchivedFrom,
} from "@budget/db";
import { moneyFromEuros, moneyToCents } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { openMonthForUser, pointFixedEntryForUser } from "../actions/month";
import { resolveCurrentMonth } from "./current-month";
import { recalculateOpenMonthSnapshotForUser } from "./recalculate-open-month";

const prisma = createTestPrismaClient();

const primaryEmail = "recalculate-open-month-test@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: primaryEmail } });
}

function createTestUser() {
  return prisma.user.create({ data: { name: "Test", email: primaryEmail, emailVerified: true } });
}

const currentMonth = resolveCurrentMonth();

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("recalculateOpenMonthSnapshotForUser", () => {
  it("does nothing when no month is open", async () => {
    const user = await createTestUser();
    await expect(recalculateOpenMonthSnapshotForUser(prisma, user.id)).resolves.toBeUndefined();
  });

  it("reflects a fixed entry's amount change made effective this month (R7)", async () => {
    const user = await createTestUser();
    const fixedEntry = await createFixedEntry(prisma, user.id, {
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: currentMonth,
        label: "Loyer",
        amount: moneyFromEuros(1000),
      },
    });
    await createVariableEnvelope(prisma, user.id, {
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: currentMonth,
        label: "Vie quotidienne",
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });
    await openMonthForUser(prisma, user.id, 2800);

    await persistFixedEntryVersion(prisma, user.id, fixedEntry.id, {
      fixedEntryId: fixedEntry.id,
      effectiveFrom: currentMonth,
      label: "Loyer",
      amount: moneyFromEuros(1050),
    });
    await recalculateOpenMonthSnapshotForUser(prisma, user.id);

    const budgetMonth = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    const entry = budgetMonth?.fixedEntries.find((e) => e.fixedEntryId === fixedEntry.id);
    expect(entry && moneyToCents(entry.amount)).toBe(moneyToCents(moneyFromEuros(1050)));
  });

  it("reflects a fixed entry's rename made effective this month (R7)", async () => {
    const user = await createTestUser();
    const fixedEntry = await createFixedEntry(prisma, user.id, {
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: currentMonth,
        label: "Loyer",
        amount: moneyFromEuros(1000),
      },
    });
    await createVariableEnvelope(prisma, user.id, {
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: currentMonth,
        label: "Vie quotidienne",
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });
    await openMonthForUser(prisma, user.id, 2800);

    await persistFixedEntryVersion(prisma, user.id, fixedEntry.id, {
      fixedEntryId: fixedEntry.id,
      effectiveFrom: currentMonth,
      label: "Loyer cave et appart",
      amount: moneyFromEuros(1000),
    });
    await recalculateOpenMonthSnapshotForUser(prisma, user.id);

    const budgetMonth = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    const entry = budgetMonth?.fixedEntries.find((e) => e.fixedEntryId === fixedEntry.id);
    expect(entry?.label).toBe("Loyer cave et appart");
  });

  it("preserves pointage status across a recalculation", async () => {
    const user = await createTestUser();
    const fixedEntry = await createFixedEntry(prisma, user.id, {
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: currentMonth,
        label: "Loyer",
        amount: moneyFromEuros(1000),
      },
    });
    await createVariableEnvelope(prisma, user.id, {
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: currentMonth,
        label: "Vie quotidienne",
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });
    await openMonthForUser(prisma, user.id, 2800);
    await pointFixedEntryForUser(prisma, user.id, { fixedEntryId: fixedEntry.id, done: true });

    await persistFixedEntryVersion(prisma, user.id, fixedEntry.id, {
      fixedEntryId: fixedEntry.id,
      effectiveFrom: currentMonth,
      label: "Loyer",
      amount: moneyFromEuros(1050),
    });
    await recalculateOpenMonthSnapshotForUser(prisma, user.id);

    const budgetMonth = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    const entry = budgetMonth?.fixedEntries.find((e) => e.fixedEntryId === fixedEntry.id);
    expect(entry?.status).toBe("done");
  });

  it("drops a fixed entry archived as of this month", async () => {
    const user = await createTestUser();
    const fixedEntry = await createFixedEntry(prisma, user.id, {
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: currentMonth,
        label: "Loyer",
        amount: moneyFromEuros(1000),
      },
    });
    await createVariableEnvelope(prisma, user.id, {
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: currentMonth,
        label: "Vie quotidienne",
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });
    await openMonthForUser(prisma, user.id, 2800);

    await setFixedEntryArchivedFrom(prisma, user.id, fixedEntry.id, currentMonth);
    await recalculateOpenMonthSnapshotForUser(prisma, user.id);

    const budgetMonth = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    expect(budgetMonth?.fixedEntries.map((e) => e.fixedEntryId)).not.toContain(fixedEntry.id);
    const fresh = await findFixedEntryById(prisma, user.id, fixedEntry.id);
    expect(fresh?.archivedFrom).toBeDefined();
  });
});
