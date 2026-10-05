import { moneyFromEuros, moneyToEuros, parseCalendarDate, parseMonth } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import {
  createContribution,
  findContributionsByUserAndMonth,
  findContributionsByUserAndProvision,
} from "./contribution";
import { createProvision } from "./provision";

const prisma = createTestPrismaClient();

const primaryEmail = "contribution-repo-test@example.com";
const otherEmail = "contribution-repo-test-other@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [primaryEmail, otherEmail] } } });
}

function createTestUser(email: string) {
  return prisma.user.create({ data: { name: "Test", email, emailVerified: true } });
}

function seedProvision(userId: string) {
  return createProvision(prisma, userId, {
    type: "deadline",
    label: "Orthodontie",
    target: moneyFromEuros(400),
    startMonth: parseMonth("2026-10"),
    durationMonths: 6,
  });
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createContribution", () => {
  it("round-trips a manual contribution", async () => {
    const user = await createTestUser(primaryEmail);
    const provision = await seedProvision(user.id);

    const created = await createContribution(prisma, user.id, {
      date: parseCalendarDate("2026-10-03"),
      amount: moneyFromEuros(100),
      provisionId: provision.id,
      origin: "manual",
    });

    expect(moneyToEuros(created.amount)).toBe(100);
    expect(created.origin).toBe("manual");
    expect(created.provisionId).toBe(provision.id);
  });

  it("rejects a provision belonging to another user", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const provision = await seedProvision(owner.id);

    await expect(
      createContribution(prisma, attacker.id, {
        date: parseCalendarDate("2026-10-03"),
        amount: moneyFromEuros(100),
        provisionId: provision.id,
        origin: "manual",
      }),
    ).rejects.toThrow();
  });

  it("rejects a non-positive amount at the database level", async () => {
    const user = await createTestUser(primaryEmail);
    const provision = await seedProvision(user.id);

    await expect(
      createContribution(prisma, user.id, {
        date: parseCalendarDate("2026-10-03"),
        amount: moneyFromEuros(0),
        provisionId: provision.id,
        origin: "manual",
      }),
    ).rejects.toThrow();
  });
});

describe("findContributionsByUserAndMonth", () => {
  it("only returns the requesting user's contributions within the month", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);
    const provision = await seedProvision(user.id);
    const otherProvision = await seedProvision(otherUser.id);

    await createContribution(prisma, user.id, {
      date: parseCalendarDate("2026-10-03"),
      amount: moneyFromEuros(100),
      provisionId: provision.id,
      origin: "manual",
    });
    await createContribution(prisma, user.id, {
      date: parseCalendarDate("2026-11-01"),
      amount: moneyFromEuros(60),
      provisionId: provision.id,
      origin: "manual",
    });
    await createContribution(prisma, otherUser.id, {
      date: parseCalendarDate("2026-10-10"),
      amount: moneyFromEuros(999),
      provisionId: otherProvision.id,
      origin: "manual",
    });

    const october = await findContributionsByUserAndMonth(prisma, user.id, parseMonth("2026-10"));
    expect(october).toHaveLength(1);
    expect(moneyToEuros(october[0]?.amount ?? moneyFromEuros(-1))).toBe(100);
  });
});

describe("findContributionsByUserAndProvision", () => {
  it("returns every contribution ever made to the provision, regardless of month", async () => {
    const user = await createTestUser(primaryEmail);
    const provision = await seedProvision(user.id);

    await createContribution(prisma, user.id, {
      date: parseCalendarDate("2026-10-03"),
      amount: moneyFromEuros(100),
      provisionId: provision.id,
      origin: "manual",
    });
    await createContribution(prisma, user.id, {
      date: parseCalendarDate("2026-11-01"),
      amount: moneyFromEuros(60),
      provisionId: provision.id,
      origin: "manual",
    });

    const all = await findContributionsByUserAndProvision(prisma, user.id, provision.id);
    expect(all).toHaveLength(2);
  });
});
