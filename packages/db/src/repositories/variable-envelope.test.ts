import { moneyFromEuros, moneyToCents, parseMonth } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import {
  addVariableEnvelopeVersion,
  createVariableEnvelope,
  findVariableEnvelopeById,
  findVariableEnvelopesByUser,
  setVariableEnvelopeArchivedFrom,
} from "./variable-envelope";

const prisma = createTestPrismaClient();

const primaryEmail = "variable-envelope-repo-test@example.com";
const otherEmail = "variable-envelope-repo-test-other@example.com";

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

describe("createVariableEnvelope / findVariableEnvelopeById", () => {
  it("round-trips label, mode and value", async () => {
    const user = await createTestUser(primaryEmail);

    const created = await createVariableEnvelope(prisma, user.id, {
      label: "Vie quotidienne",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });

    expect(created.label).toBe("Vie quotidienne");
    expect(created.versions).toHaveLength(1);

    const found = await findVariableEnvelopeById(prisma, user.id, created.id);
    expect(found).not.toBeNull();
    const version = found?.versions[0];
    expect(version?.mode).toBe("amount");
    if (version?.mode === "amount") {
      expect(moneyToCents(version.value)).toBe(15000);
    }
  });
});

describe("findVariableEnvelopesByUser", () => {
  it("only returns the requesting user's envelopes", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);

    await createVariableEnvelope(prisma, user.id, {
      label: "Sorties et loisirs",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "percentage",
        value: 15,
      },
    });
    await createVariableEnvelope(prisma, otherUser.id, {
      label: "Autre utilisatrice",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "percentage",
        value: 20,
      },
    });

    const envelopes = await findVariableEnvelopesByUser(prisma, user.id);
    expect(envelopes).toHaveLength(1);
    expect(envelopes[0]?.label).toBe("Sorties et loisirs");
  });
});

describe("addVariableEnvelopeVersion", () => {
  it("appends a version with a different mode", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createVariableEnvelope(prisma, user.id, {
      label: "Achats plaisir",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "amount",
        value: moneyFromEuros(80),
      },
    });

    const updated = await addVariableEnvelopeVersion(prisma, user.id, created.id, {
      envelopeId: created.id,
      effectiveFrom: parseMonth("2026-02"),
      mode: "percentage",
      value: 15,
    });

    expect(updated.versions).toHaveLength(2);
    const secondVersion = updated.versions.find((v) => v.mode === "percentage");
    expect(secondVersion?.mode).toBe("percentage");
    if (secondVersion?.mode === "percentage") {
      expect(secondVersion.value).toBe(15);
    }
  });

  it("rejects adding a version to another user's envelope", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const created = await createVariableEnvelope(prisma, owner.id, {
      label: "Achats plaisir",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "amount",
        value: moneyFromEuros(80),
      },
    });

    await expect(
      addVariableEnvelopeVersion(prisma, attacker.id, created.id, {
        envelopeId: created.id,
        effectiveFrom: parseMonth("2026-02"),
        mode: "amount",
        value: moneyFromEuros(999),
      }),
    ).rejects.toThrow();

    const untouched = await findVariableEnvelopeById(prisma, owner.id, created.id);
    expect(untouched?.versions).toHaveLength(1);
  });
});

describe("setVariableEnvelopeArchivedFrom", () => {
  it("sets then clears the archive date", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createVariableEnvelope(prisma, user.id, {
      label: "Vie quotidienne",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });

    const archived = await setVariableEnvelopeArchivedFrom(
      prisma,
      user.id,
      created.id,
      parseMonth("2026-03"),
    );
    expect(archived.archivedFrom).toEqual(parseMonth("2026-03"));

    const unarchived = await setVariableEnvelopeArchivedFrom(prisma, user.id, created.id, null);
    expect(unarchived.archivedFrom).toBeUndefined();
  });

  it("rejects archiving another user's envelope", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const created = await createVariableEnvelope(prisma, owner.id, {
      label: "Vie quotidienne",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });

    await expect(
      setVariableEnvelopeArchivedFrom(prisma, attacker.id, created.id, parseMonth("2026-03")),
    ).rejects.toThrow();

    const untouched = await findVariableEnvelopeById(prisma, owner.id, created.id);
    expect(untouched?.archivedFrom).toBeUndefined();
  });
});

describe("database constraints", () => {
  it("rejects a version row with both amount_cents and percentage set", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createVariableEnvelope(prisma, user.id, {
      label: "Vie quotidienne",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });

    await expect(
      prisma.variableEnvelopeVersion.create({
        data: {
          envelopeId: created.id,
          effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
          mode: "amount",
          amountCents: 1000,
          percentage: 10,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a version row with neither amount_cents nor percentage set", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createVariableEnvelope(prisma, user.id, {
      label: "Vie quotidienne",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });

    await expect(
      prisma.variableEnvelopeVersion.create({
        data: {
          envelopeId: created.id,
          effectiveFrom: new Date("2026-02-01T00:00:00.000Z"),
          mode: "amount",
          amountCents: null,
          percentage: null,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects an effectiveFrom that isn't the first day of the month", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createVariableEnvelope(prisma, user.id, {
      label: "Vie quotidienne",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });

    await expect(
      prisma.variableEnvelopeVersion.create({
        data: {
          envelopeId: created.id,
          effectiveFrom: new Date("2026-02-15T00:00:00.000Z"),
          mode: "amount",
          amountCents: 1000,
          percentage: null,
        },
      }),
    ).rejects.toThrow();
  });
});
