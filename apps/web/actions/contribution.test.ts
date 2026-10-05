import {
  createProvision,
  createTestPrismaClient,
  findContributionsByUserAndMonth,
} from "@budget/db";
import { moneyFromEuros, moneyToCents } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveCurrentMonth } from "../lib/current-month";
import { createContributionForUser } from "./contribution";
import { openMonthForUser } from "./month";

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
