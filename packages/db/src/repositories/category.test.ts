import { moneyFromEuros, parseMonth } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import {
  createCategory,
  findCategoriesByUser,
  findCategoryById,
  setCategoryArchived,
} from "./category";
import { createVariableEnvelope } from "./variable-envelope";

const prisma = createTestPrismaClient();

const primaryEmail = "category-repo-test@example.com";
const otherEmail = "category-repo-test-other@example.com";

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

describe("createCategory / findCategoryById", () => {
  it("round-trips label and defaultEnvelopeId", async () => {
    const user = await createTestUser(primaryEmail);
    const envelope = await createVariableEnvelope(prisma, user.id, {
      label: "Vie quotidienne",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });

    const created = await createCategory(prisma, user.id, {
      label: "Courses",
      defaultEnvelopeId: envelope.id,
    });

    expect(created.label).toBe("Courses");
    expect(created.defaultEnvelopeId).toBe(envelope.id);
    expect(created.archived).toBe(false);

    const found = await findCategoryById(prisma, user.id, created.id);
    expect(found).toEqual(created);
  });

  it("allows no default envelope", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createCategory(prisma, user.id, { label: "Soins et imprévus" });
    expect(created.defaultEnvelopeId).toBeUndefined();
  });
});

describe("findCategoriesByUser", () => {
  it("only returns the requesting user's categories", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);

    await createCategory(prisma, user.id, { label: "Courses" });
    await createCategory(prisma, otherUser.id, { label: "Autre utilisatrice" });

    const categories = await findCategoriesByUser(prisma, user.id);
    expect(categories).toHaveLength(1);
    expect(categories[0]?.label).toBe("Courses");
  });
});

describe("setCategoryArchived", () => {
  it("sets then clears the archived flag", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createCategory(prisma, user.id, { label: "Courses" });

    const archived = await setCategoryArchived(prisma, user.id, created.id, true);
    expect(archived.archived).toBe(true);

    const unarchived = await setCategoryArchived(prisma, user.id, created.id, false);
    expect(unarchived.archived).toBe(false);
  });

  it("rejects archiving another user's category", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const created = await createCategory(prisma, owner.id, { label: "Courses" });

    await expect(setCategoryArchived(prisma, attacker.id, created.id, true)).rejects.toThrow();

    const untouched = await findCategoryById(prisma, owner.id, created.id);
    expect(untouched?.archived).toBe(false);
  });
});
