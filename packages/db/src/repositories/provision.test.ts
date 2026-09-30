import { moneyFromEuros, moneyToCents, parseMonth } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import {
  createProvision,
  findProvisionById,
  findProvisionsByUser,
  setProvisionArchivedFrom,
  updateProvisionGoal,
} from "./provision";

const prisma = createTestPrismaClient();

const primaryEmail = "provision-repo-test@example.com";
const otherEmail = "provision-repo-test-other@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [primaryEmail, otherEmail] } } });
}

function createTestUser(email: string) {
  return prisma.user.create({ data: { name: "Test", email, emailVerified: true } });
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createProvision / findProvisionById", () => {
  it("round-trips a deadline provision", async () => {
    const user = await createTestUser(primaryEmail);

    const created = await createProvision(prisma, user.id, {
      type: "deadline",
      label: "Orthodontie",
      target: moneyFromEuros(400),
      startMonth: parseMonth("2026-01"),
      durationMonths: 6,
    });

    expect(created.label).toBe("Orthodontie");
    expect(created.type).toBe("deadline");
    expect(created.status).toBe("active");
    expect(moneyToCents(created.target)).toBe(40000);
    expect(created.type === "deadline" && created.durationMonths).toBe(6);
    expect(created.type === "deadline" && created.startMonth).toEqual(parseMonth("2026-01"));

    const found = await findProvisionById(prisma, user.id, created.id);
    expect(found).not.toBeNull();
    expect(found?.label).toBe("Orthodontie");
  });

  it("round-trips a reserve provision", async () => {
    const user = await createTestUser(primaryEmail);

    const created = await createProvision(prisma, user.id, {
      type: "reserve",
      label: "Imprévus",
      target: moneyFromEuros(250),
      monthlyAmount: moneyFromEuros(50),
    });

    expect(created.type).toBe("reserve");
    expect(created.type === "reserve" && moneyToCents(created.monthlyAmount)).toBe(5000);
  });
});

describe("findProvisionsByUser", () => {
  it("only returns the requesting user's provisions", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);

    await createProvision(prisma, user.id, {
      type: "reserve",
      label: "Imprévus",
      target: moneyFromEuros(250),
      monthlyAmount: moneyFromEuros(50),
    });
    await createProvision(prisma, otherUser.id, {
      type: "reserve",
      label: "Autre utilisatrice",
      target: moneyFromEuros(100),
      monthlyAmount: moneyFromEuros(10),
    });

    const provisions = await findProvisionsByUser(prisma, user.id);
    expect(provisions).toHaveLength(1);
    expect(provisions[0]?.label).toBe("Imprévus");
  });
});

describe("updateProvisionGoal", () => {
  it("replaces the target and duration of a deadline provision", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createProvision(prisma, user.id, {
      type: "deadline",
      label: "Orthodontie",
      target: moneyFromEuros(400),
      startMonth: parseMonth("2026-01"),
      durationMonths: 6,
    });

    const updated = await updateProvisionGoal(prisma, user.id, created.id, {
      type: "deadline",
      target: moneyFromEuros(500),
      durationMonths: 8,
    });

    expect(moneyToCents(updated.target)).toBe(50000);
    expect(updated.type === "deadline" && updated.durationMonths).toBe(8);
    // startMonth is untouched by this update.
    expect(updated.type === "deadline" && updated.startMonth).toEqual(parseMonth("2026-01"));
  });

  it("replaces the target and monthly amount of a reserve", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createProvision(prisma, user.id, {
      type: "reserve",
      label: "Imprévus",
      target: moneyFromEuros(250),
      monthlyAmount: moneyFromEuros(50),
    });

    const updated = await updateProvisionGoal(prisma, user.id, created.id, {
      type: "reserve",
      target: moneyFromEuros(300),
      monthlyAmount: moneyFromEuros(60),
    });

    expect(moneyToCents(updated.target)).toBe(30000);
    expect(updated.type === "reserve" && moneyToCents(updated.monthlyAmount)).toBe(6000);
  });

  it("rejects updating another user's provision", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const created = await createProvision(prisma, owner.id, {
      type: "reserve",
      label: "Imprévus",
      target: moneyFromEuros(250),
      monthlyAmount: moneyFromEuros(50),
    });

    await expect(
      updateProvisionGoal(prisma, attacker.id, created.id, {
        type: "reserve",
        target: moneyFromEuros(1),
        monthlyAmount: moneyFromEuros(1),
      }),
    ).rejects.toThrow();

    const untouched = await findProvisionById(prisma, owner.id, created.id);
    expect(untouched?.type === "reserve" && moneyToCents(untouched.target)).toBe(25000);
  });
});

describe("setProvisionArchivedFrom", () => {
  it("sets then clears the archive date", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createProvision(prisma, user.id, {
      type: "reserve",
      label: "Imprévus",
      target: moneyFromEuros(250),
      monthlyAmount: moneyFromEuros(50),
    });

    const archived = await setProvisionArchivedFrom(
      prisma,
      user.id,
      created.id,
      parseMonth("2026-03"),
    );
    expect(archived.archivedFrom).toEqual(parseMonth("2026-03"));

    const unarchived = await setProvisionArchivedFrom(prisma, user.id, created.id, null);
    expect(unarchived.archivedFrom).toBeUndefined();
  });

  it("rejects archiving another user's provision", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const created = await createProvision(prisma, owner.id, {
      type: "reserve",
      label: "Imprévus",
      target: moneyFromEuros(250),
      monthlyAmount: moneyFromEuros(50),
    });

    await expect(
      setProvisionArchivedFrom(prisma, attacker.id, created.id, parseMonth("2026-03")),
    ).rejects.toThrow();

    const untouched = await findProvisionById(prisma, owner.id, created.id);
    expect(untouched?.archivedFrom).toBeUndefined();
  });
});

describe("database constraints", () => {
  it("rejects a zero or negative target", async () => {
    const user = await createTestUser(primaryEmail);

    await expect(
      prisma.provision.create({
        data: {
          userId: user.id,
          label: "Invalide",
          type: "reserve",
          targetCents: 0,
          monthlyAmountCents: 5000,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a deadline provision with a zero duration", async () => {
    const user = await createTestUser(primaryEmail);

    await expect(
      prisma.provision.create({
        data: {
          userId: user.id,
          label: "Invalide",
          type: "deadline",
          targetCents: 40000,
          startMonth: new Date("2026-01-01T00:00:00.000Z"),
          durationMonths: 0,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a deadline provision missing its start month", async () => {
    const user = await createTestUser(primaryEmail);

    await expect(
      prisma.provision.create({
        data: {
          userId: user.id,
          label: "Invalide",
          type: "deadline",
          targetCents: 40000,
          durationMonths: 6,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a reserve provision that also sets deadline-only fields", async () => {
    const user = await createTestUser(primaryEmail);

    await expect(
      prisma.provision.create({
        data: {
          userId: user.id,
          label: "Invalide",
          type: "reserve",
          targetCents: 25000,
          monthlyAmountCents: 5000,
          durationMonths: 6,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects an effectiveFrom-like date that isn't the first day of the month", async () => {
    const user = await createTestUser(primaryEmail);

    await expect(
      prisma.provision.create({
        data: {
          userId: user.id,
          label: "Invalide",
          type: "deadline",
          targetCents: 40000,
          startMonth: new Date("2026-01-15T00:00:00.000Z"),
          durationMonths: 6,
        },
      }),
    ).rejects.toThrow();
  });
});
