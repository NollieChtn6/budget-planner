import {
  createContribution,
  createProvision,
  createTestPrismaClient,
  findContributionsByUserAndMonth,
} from "@budget/db";
import { moneyFromEuros, moneyToCents, parseCalendarDate } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveCurrentMonth } from "../lib/current-month";
import {
  createContributionForUser,
  deleteContributionForUser,
  updateContributionForUser,
} from "./contribution";
import { closeMonthForUser, openMonthForUser } from "./month";

const prisma = createTestPrismaClient();

const primaryEmail = "contribution-action-test@example.com";

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
  const provision = await createProvision(prisma, userId, {
    type: "reserve",
    label: "Imprévus",
    target: moneyFromEuros(250),
    monthlyAmount: moneyFromEuros(50),
  });
  await openMonthForUser(prisma, userId, 2800);
  return { provision };
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createContributionForUser", () => {
  it("records a contribution to a budgeted provision", async () => {
    const user = await createTestUser();
    const { provision } = await seedOpenMonth(user.id);

    const result = await createContributionForUser(prisma, user.id, {
      amountEuros: 50,
      date: today,
      provisionId: provision.id,
    });

    expect(result.status).toBe("success");
    const contributions = await findContributionsByUserAndMonth(prisma, user.id, currentMonth);
    expect(contributions).toHaveLength(1);
    expect(moneyToCents(contributions[0]?.amount ?? moneyFromEuros(-1))).toBe(5000);
  });

  it("rejects a contribution when the month isn't open", async () => {
    const user = await createTestUser();
    const provision = await createProvision(prisma, user.id, {
      type: "reserve",
      label: "Imprévus",
      target: moneyFromEuros(250),
      monthlyAmount: moneyFromEuros(50),
    });

    const result = await createContributionForUser(prisma, user.id, {
      amountEuros: 50,
      date: today,
      provisionId: provision.id,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("ouvert");
  });

  it("rejects a zero amount", async () => {
    const user = await createTestUser();
    const { provision } = await seedOpenMonth(user.id);

    const result = await createContributionForUser(prisma, user.id, {
      amountEuros: 0,
      date: today,
      provisionId: provision.id,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("supérieur à 0");
  });

  it("rejects a provision outside this month's snapshot", async () => {
    const user = await createTestUser();
    await seedOpenMonth(user.id);
    const otherProvision = await createProvision(prisma, user.id, {
      type: "reserve",
      label: "Ajoutée après ouverture",
      target: moneyFromEuros(100),
      monthlyAmount: moneyFromEuros(20),
    });

    const result = await createContributionForUser(prisma, user.id, {
      amountEuros: 50,
      date: today,
      provisionId: otherProvision.id,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("budget de ce mois");
  });
});

describe("updateContributionForUser", () => {
  it("revises a manual contribution's amount", async () => {
    const user = await createTestUser();
    const { provision } = await seedOpenMonth(user.id);
    const contribution = await createContribution(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(50),
      provisionId: provision.id,
      origin: "manual",
    });

    const result = await updateContributionForUser(prisma, user.id, {
      id: contribution.id,
      amountEuros: 80,
      date: today,
      provisionId: provision.id,
    });

    expect(result.status).toBe("success");
    const contributions = await findContributionsByUserAndMonth(prisma, user.id, currentMonth);
    expect(moneyToCents(contributions[0]?.amount ?? moneyFromEuros(-1))).toBe(8000);
  });

  it("rejects a contribution created by a month closing", async () => {
    const user = await createTestUser();
    const { provision } = await seedOpenMonth(user.id);
    const contribution = await createContribution(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(50),
      provisionId: provision.id,
      origin: "closing",
    });

    const result = await updateContributionForUser(prisma, user.id, {
      id: contribution.id,
      amountEuros: 80,
      date: today,
      provisionId: provision.id,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("clôture");
  });

  it("rejects when the month isn't open", async () => {
    const user = await createTestUser();
    const { provision } = await seedOpenMonth(user.id);
    const contribution = await createContribution(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(50),
      provisionId: provision.id,
      origin: "manual",
    });
    await closeMonthForUser(prisma, user.id, { allocations: [] });

    const result = await updateContributionForUser(prisma, user.id, {
      id: contribution.id,
      amountEuros: 80,
      date: today,
      provisionId: provision.id,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("ouvert");
  });
});

describe("deleteContributionForUser", () => {
  it("removes a manual contribution", async () => {
    const user = await createTestUser();
    const { provision } = await seedOpenMonth(user.id);
    const contribution = await createContribution(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(50),
      provisionId: provision.id,
      origin: "manual",
    });

    const result = await deleteContributionForUser(prisma, user.id, contribution.id);

    expect(result.status).toBe("success");
    const contributions = await findContributionsByUserAndMonth(prisma, user.id, currentMonth);
    expect(contributions).toHaveLength(0);
  });

  it("rejects deleting a contribution created by a month closing", async () => {
    const user = await createTestUser();
    const { provision } = await seedOpenMonth(user.id);
    const contribution = await createContribution(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(50),
      provisionId: provision.id,
      origin: "closing",
    });

    const result = await deleteContributionForUser(prisma, user.id, contribution.id);

    expect(result.status).toBe("error");
    expect(result.message).toContain("clôture");
  });
});
