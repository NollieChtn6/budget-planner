import {
  createContribution,
  createFixedEntry,
  createProvision,
  createTestPrismaClient,
  createVariableEnvelope,
  findBudgetMonthByMonth,
  findContributionsByUserAndProvision,
  findProvisionById,
} from "@budget/db";
import { formatMonth, moneyFromEuros, moneyToCents, parseCalendarDate } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveCurrentMonth } from "../lib/current-month";
import {
  closeMonthForUser,
  openMonthForUser,
  pointFixedEntryForUser,
  reopenMonthForUser,
} from "./month";

const prisma = createTestPrismaClient();

const primaryEmail = "month-action-test@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: primaryEmail } });
}

function createTestUser() {
  return prisma.user.create({ data: { name: "Test", email: primaryEmail, emailVerified: true } });
}

const currentMonth = resolveCurrentMonth();
const today = `${formatMonth(currentMonth)}-05`;

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
  const provision = await createProvision(prisma, userId, {
    type: "reserve",
    label: "Imprévus",
    target: moneyFromEuros(250),
    monthlyAmount: moneyFromEuros(50),
  });
  return { provision };
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

  it("uses a provision's real balance (R18), not a hardcoded 0", async () => {
    const user = await createTestUser();
    const provision = await createProvision(prisma, user.id, {
      type: "deadline",
      label: "Orthodontie",
      target: moneyFromEuros(400),
      startMonth: currentMonth,
      durationMonths: 6,
    });
    await createContribution(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(100),
      provisionId: provision.id,
      origin: "manual",
    });

    const result = await openMonthForUser(prisma, user.id, 2800);
    expect(result.status).toBe("success");

    const budgetMonth = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    // (400 - 100) / 6 = 50
    expect(moneyToCents(budgetMonth?.provisionTargets[0]?.target ?? moneyFromEuros(-1))).toBe(5000);
  });
});

describe("pointFixedEntryForUser", () => {
  it("points a planned fixed entry to done, then back to planned", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);
    await openMonthForUser(prisma, user.id, 2800);
    const budgetMonth = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    const fixedEntryId = budgetMonth?.fixedEntries[0]?.fixedEntryId ?? "";

    const done = await pointFixedEntryForUser(prisma, user.id, { fixedEntryId, done: true });
    expect(done.status).toBe("success");
    expect(
      (await findBudgetMonthByMonth(prisma, user.id, currentMonth))?.fixedEntries[0]?.status,
    ).toBe("done");

    const planned = await pointFixedEntryForUser(prisma, user.id, { fixedEntryId, done: false });
    expect(planned.status).toBe("success");
    expect(
      (await findBudgetMonthByMonth(prisma, user.id, currentMonth))?.fixedEntries[0]?.status,
    ).toBe("planned");
  });

  it("rejects pointing when no month is open", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);

    const result = await pointFixedEntryForUser(prisma, user.id, {
      fixedEntryId: "unknown",
      done: true,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("pas ouvert");
  });

  it("rejects a fixed entry outside this month's snapshot", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);
    await openMonthForUser(prisma, user.id, 2800);

    const result = await pointFixedEntryForUser(prisma, user.id, {
      fixedEntryId: "unknown",
      done: true,
    });

    expect(result.status).toBe("error");
  });
});

describe("closeMonthForUser", () => {
  it("locks the month and splits the leftover toward savings and a provision", async () => {
    const user = await createTestUser();
    const { provision } = await seedParameterization(user.id);
    await openMonthForUser(prisma, user.id, 2800);

    const result = await closeMonthForUser(prisma, user.id, {
      allocations: [
        { destination: "savings", provisionId: "", amountEuros: 20 },
        { destination: "provision", provisionId: provision.id, amountEuros: 30 },
      ],
    });

    expect(result.status).toBe("success");
    const closed = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    expect(closed?.status).toBe("closed");

    const contributions = await findContributionsByUserAndProvision(prisma, user.id, provision.id);
    expect(contributions).toHaveLength(1);
    expect(contributions[0]?.origin).toBe("closing");
    expect(moneyToCents(contributions[0]?.amount ?? moneyFromEuros(-1))).toBe(3000);
  });

  it("ignores blank or zero allocation rows instead of rejecting them", async () => {
    const user = await createTestUser();
    const { provision } = await seedParameterization(user.id);
    await openMonthForUser(prisma, user.id, 2800);

    const result = await closeMonthForUser(prisma, user.id, {
      allocations: [
        { destination: "savings", provisionId: "", amountEuros: 0 },
        { destination: "provision", provisionId: provision.id, amountEuros: Number.NaN },
      ],
    });

    expect(result.status).toBe("success");
    const contributions = await findContributionsByUserAndProvision(prisma, user.id, provision.id);
    expect(contributions).toHaveLength(0);
  });

  it("rejects closing when the month isn't open", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);

    const result = await closeMonthForUser(prisma, user.id, { allocations: [] });

    expect(result.status).toBe("error");
    expect(result.message).toContain("ouvert");
  });

  it("rejects a provision outside this month's snapshot", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);
    await openMonthForUser(prisma, user.id, 2800);
    const otherProvision = await createProvision(prisma, user.id, {
      type: "reserve",
      label: "Ajoutée après ouverture",
      target: moneyFromEuros(100),
      monthlyAmount: moneyFromEuros(20),
    });

    const result = await closeMonthForUser(prisma, user.id, {
      allocations: [{ destination: "provision", provisionId: otherProvision.id, amountEuros: 10 }],
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("budget de ce mois");
  });
});

describe("closeMonthForUser — R20 late transition", () => {
  it("marks a deadline provision late when its due month closes incomplete", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);
    const dueThisMonth = await createProvision(prisma, user.id, {
      type: "deadline",
      label: "Orthodontie",
      target: moneyFromEuros(400),
      startMonth: currentMonth,
      durationMonths: 1,
    });
    await openMonthForUser(prisma, user.id, 2800);

    const result = await closeMonthForUser(prisma, user.id, { allocations: [] });
    expect(result.status).toBe("success");

    const found = await findProvisionById(prisma, user.id, dueThisMonth.id);
    expect(found?.status).toBe("late");
  });

  it("doesn't mark a deadline provision late once its target is reached", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);
    const dueThisMonth = await createProvision(prisma, user.id, {
      type: "deadline",
      label: "Orthodontie",
      target: moneyFromEuros(400),
      startMonth: currentMonth,
      durationMonths: 1,
    });
    await createContribution(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(400),
      provisionId: dueThisMonth.id,
      origin: "manual",
    });
    await openMonthForUser(prisma, user.id, 2800);

    await closeMonthForUser(prisma, user.id, { allocations: [] });

    const found = await findProvisionById(prisma, user.id, dueThisMonth.id);
    expect(found?.status).toBe("active");
  });

  it("doesn't mark a deadline provision late before its due month", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);
    const dueNextMonth = await createProvision(prisma, user.id, {
      type: "deadline",
      label: "Vacances",
      target: moneyFromEuros(700),
      startMonth: currentMonth,
      durationMonths: 2,
    });
    await openMonthForUser(prisma, user.id, 2800);

    await closeMonthForUser(prisma, user.id, { allocations: [] });

    const found = await findProvisionById(prisma, user.id, dueNextMonth.id);
    expect(found?.status).toBe("active");
  });
});

describe("reopenMonthForUser", () => {
  it("unlocks a closed month, allowing a forgotten operation to be added", async () => {
    const user = await createTestUser();
    const { provision } = await seedParameterization(user.id);
    await openMonthForUser(prisma, user.id, 2800);
    await closeMonthForUser(prisma, user.id, { allocations: [] });

    const result = await reopenMonthForUser(prisma, user.id);
    expect(result.status).toBe("success");

    const reopened = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    expect(reopened?.status).toBe("open");

    // R29: a forgotten contribution can now be added, then the month re-closed.
    const added = await closeMonthForUser(prisma, user.id, {
      allocations: [{ destination: "provision", provisionId: provision.id, amountEuros: 10 }],
    });
    expect(added.status).toBe("success");
    const closedAgain = await findBudgetMonthByMonth(prisma, user.id, currentMonth);
    expect(closedAgain?.status).toBe("closed");
  });

  it("rejects reopening a month that isn't closed", async () => {
    const user = await createTestUser();
    await seedParameterization(user.id);
    await openMonthForUser(prisma, user.id, 2800);

    const result = await reopenMonthForUser(prisma, user.id);

    expect(result.status).toBe("error");
    expect(result.message).toContain("clôturé");
  });

  it("rejects reopening when no month has ever been opened", async () => {
    const user = await createTestUser();

    const result = await reopenMonthForUser(prisma, user.id);

    expect(result.status).toBe("error");
  });
});
