import { moneyFromEuros, moneyToEuros, parseCalendarDate, parseMonth } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import { createCategory } from "./category";
import { createExpense, findExpensesByUserAndMonth } from "./expense";
import { createVariableEnvelope } from "./variable-envelope";

const prisma = createTestPrismaClient();

const primaryEmail = "expense-repo-test@example.com";
const otherEmail = "expense-repo-test-other@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [primaryEmail, otherEmail] } } });
}

function createTestUser(email: string) {
  return prisma.user.create({ data: { name: "Test", email, emailVerified: true } });
}

async function seedEnvelopeAndCategory(userId: string) {
  const envelope = await createVariableEnvelope(prisma, userId, {
    label: "Vie quotidienne",
    firstVersion: {
      envelopeId: "pending",
      effectiveFrom: parseMonth("2026-01"),
      mode: "amount",
      value: moneyFromEuros(150),
    },
  });
  const category = await createCategory(prisma, userId, { label: "Courses" });
  return { envelope, category };
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createExpense", () => {
  it("round-trips an expense imputed to an envelope", async () => {
    const user = await createTestUser(primaryEmail);
    const { envelope, category } = await seedEnvelopeAndCategory(user.id);

    const created = await createExpense(prisma, user.id, {
      date: parseCalendarDate("2026-10-05"),
      amount: moneyFromEuros(15),
      place: "Monoprix",
      description: "Produits d'entretien",
      categoryId: category.id,
      source: { type: "envelope", envelopeId: envelope.id },
    });

    expect(moneyToEuros(created.amount)).toBe(15);
    expect(created.place).toBe("Monoprix");
    expect(created.source).toEqual({ type: "envelope", envelopeId: envelope.id });
  });

  it("rejects an envelope belonging to another user", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const { envelope } = await seedEnvelopeAndCategory(owner.id);
    const attackerCategory = await createCategory(prisma, attacker.id, { label: "Courses" });

    await expect(
      createExpense(prisma, attacker.id, {
        date: parseCalendarDate("2026-10-05"),
        amount: moneyFromEuros(15),
        categoryId: attackerCategory.id,
        source: { type: "envelope", envelopeId: envelope.id },
      }),
    ).rejects.toThrow();
  });

  it("rejects a category belonging to another user", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const { category } = await seedEnvelopeAndCategory(owner.id);
    const attackerEnvelope = await createVariableEnvelope(prisma, attacker.id, {
      label: "Vie quotidienne",
      firstVersion: {
        envelopeId: "pending",
        effectiveFrom: parseMonth("2026-01"),
        mode: "amount",
        value: moneyFromEuros(150),
      },
    });

    await expect(
      createExpense(prisma, attacker.id, {
        date: parseCalendarDate("2026-10-05"),
        amount: moneyFromEuros(15),
        categoryId: category.id,
        source: { type: "envelope", envelopeId: attackerEnvelope.id },
      }),
    ).rejects.toThrow();
  });

  it("rejects a non-positive amount at the database level", async () => {
    const user = await createTestUser(primaryEmail);
    const { envelope, category } = await seedEnvelopeAndCategory(user.id);

    await expect(
      createExpense(prisma, user.id, {
        date: parseCalendarDate("2026-10-05"),
        amount: moneyFromEuros(0),
        categoryId: category.id,
        source: { type: "envelope", envelopeId: envelope.id },
      }),
    ).rejects.toThrow();
  });
});

describe("findExpensesByUserAndMonth", () => {
  it("only returns the requesting user's expenses within the month", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);
    const { envelope, category } = await seedEnvelopeAndCategory(user.id);
    const otherSetup = await seedEnvelopeAndCategory(otherUser.id);

    await createExpense(prisma, user.id, {
      date: parseCalendarDate("2026-10-05"),
      amount: moneyFromEuros(15),
      categoryId: category.id,
      source: { type: "envelope", envelopeId: envelope.id },
    });
    await createExpense(prisma, user.id, {
      date: parseCalendarDate("2026-11-01"),
      amount: moneyFromEuros(20),
      categoryId: category.id,
      source: { type: "envelope", envelopeId: envelope.id },
    });
    await createExpense(prisma, otherUser.id, {
      date: parseCalendarDate("2026-10-10"),
      amount: moneyFromEuros(99),
      categoryId: otherSetup.category.id,
      source: { type: "envelope", envelopeId: otherSetup.envelope.id },
    });

    const october = await findExpensesByUserAndMonth(prisma, user.id, parseMonth("2026-10"));
    expect(october).toHaveLength(1);
    expect(moneyToEuros(october[0]?.amount ?? moneyFromEuros(-1))).toBe(15);
  });
});
