import { moneyFromEuros, moneyToCents, parseMonth } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import {
  addFixedEntryVersion,
  createFixedEntry,
  findFixedEntriesByUser,
  findFixedEntryById,
  setFixedEntryArchivedFrom,
} from "./fixed-entry";

const prisma = createTestPrismaClient();

const primaryEmail = "fixed-entry-repo-test@example.com";
const otherEmail = "fixed-entry-repo-test-other@example.com";

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

describe("createFixedEntry / findFixedEntryById", () => {
  it("round-trips label, type and amount", async () => {
    const user = await createTestUser(primaryEmail);

    const created = await createFixedEntry(prisma, user.id, {
      label: "Loyer",
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        amount: moneyFromEuros(1000),
      },
    });

    expect(created.label).toBe("Loyer");
    expect(created.type).toBe("charge");
    expect(created.versions).toHaveLength(1);

    const found = await findFixedEntryById(prisma, user.id, created.id);
    expect(found).not.toBeNull();
    const version = found?.versions[0];
    expect(version && moneyToCents(version.amount)).toBe(100000);
  });

  it("round-trips the scheduledSaving type", async () => {
    const user = await createTestUser(primaryEmail);

    const created = await createFixedEntry(prisma, user.id, {
      label: "Assurance vie",
      type: "scheduledSaving",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        amount: moneyFromEuros(100),
      },
    });

    expect(created.type).toBe("scheduledSaving");
  });
});

describe("findFixedEntriesByUser", () => {
  it("only returns the requesting user's fixed entries", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);

    await createFixedEntry(prisma, user.id, {
      label: "Loyer",
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        amount: moneyFromEuros(1000),
      },
    });
    await createFixedEntry(prisma, otherUser.id, {
      label: "Autre utilisatrice",
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        amount: moneyFromEuros(500),
      },
    });

    const entries = await findFixedEntriesByUser(prisma, user.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Loyer");
  });
});

describe("addFixedEntryVersion", () => {
  it("appends a version with a new amount", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createFixedEntry(prisma, user.id, {
      label: "Loyer",
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        amount: moneyFromEuros(1000),
      },
    });

    const updated = await addFixedEntryVersion(prisma, user.id, created.id, {
      fixedEntryId: created.id,
      effectiveFrom: parseMonth("2026-02"),
      amount: moneyFromEuros(1050),
    });

    expect(updated.versions).toHaveLength(2);
    const secondVersion = updated.versions.find((v) => moneyToCents(v.amount) === 105000);
    expect(secondVersion).toBeDefined();
  });

  it("rejects adding a version to another user's fixed entry", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const created = await createFixedEntry(prisma, owner.id, {
      label: "Loyer",
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        amount: moneyFromEuros(1000),
      },
    });

    await expect(
      addFixedEntryVersion(prisma, attacker.id, created.id, {
        fixedEntryId: created.id,
        effectiveFrom: parseMonth("2026-02"),
        amount: moneyFromEuros(1),
      }),
    ).rejects.toThrow();

    const untouched = await findFixedEntryById(prisma, owner.id, created.id);
    expect(untouched?.versions).toHaveLength(1);
  });
});

describe("setFixedEntryArchivedFrom", () => {
  it("sets then clears the archive date", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createFixedEntry(prisma, user.id, {
      label: "Loyer",
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        amount: moneyFromEuros(1000),
      },
    });

    const archived = await setFixedEntryArchivedFrom(
      prisma,
      user.id,
      created.id,
      parseMonth("2026-03"),
    );
    expect(archived.archivedFrom).toEqual(parseMonth("2026-03"));

    const unarchived = await setFixedEntryArchivedFrom(prisma, user.id, created.id, null);
    expect(unarchived.archivedFrom).toBeUndefined();
  });

  it("rejects archiving another user's fixed entry", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const created = await createFixedEntry(prisma, owner.id, {
      label: "Loyer",
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        amount: moneyFromEuros(1000),
      },
    });

    await expect(
      setFixedEntryArchivedFrom(prisma, attacker.id, created.id, parseMonth("2026-03")),
    ).rejects.toThrow();

    const untouched = await findFixedEntryById(prisma, owner.id, created.id);
    expect(untouched?.archivedFrom).toBeUndefined();
  });
});

describe("database constraints", () => {
  it("rejects a negative amount_cents", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createFixedEntry(prisma, user.id, {
      label: "Loyer",
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        amount: moneyFromEuros(1000),
      },
    });

    await expect(
      prisma.fixedEntryVersion.create({
        data: {
          fixedEntryId: created.id,
          effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
          amountCents: -100,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects an effectiveFrom that isn't the first day of the month", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createFixedEntry(prisma, user.id, {
      label: "Loyer",
      type: "charge",
      firstVersion: {
        fixedEntryId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        amount: moneyFromEuros(1000),
      },
    });

    await expect(
      prisma.fixedEntryVersion.create({
        data: {
          fixedEntryId: created.id,
          effectiveFrom: new Date("2026-02-15T00:00:00.000Z"),
          amountCents: 1000,
        },
      }),
    ).rejects.toThrow();
  });
});
