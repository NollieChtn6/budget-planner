import { moneyFromEuros, moneyToEuros, parseCalendarDate, parseMonth } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import {
  createExtraIncome,
  deleteExtraIncome,
  findExtraIncomeById,
  findExtraIncomesByUserAndMonth,
  updateExtraIncome,
} from "./extra-income";

const prisma = createTestPrismaClient();

const primaryEmail = "extra-income-repo-test@example.com";
const otherEmail = "extra-income-repo-test-other@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [primaryEmail, otherEmail] } } });
}

function createTestUser(email: string) {
  return prisma.user.create({ data: { name: "Test", email, emailVerified: true } });
}

function cheque(date = "2026-10-12") {
  return { date: parseCalendarDate(date), amount: moneyFromEuros(100), label: "Chèque cadeau" };
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createExtraIncome", () => {
  it("round-trips an extra income", async () => {
    const user = await createTestUser(primaryEmail);

    const created = await createExtraIncome(prisma, user.id, cheque());

    expect(moneyToEuros(created.amount)).toBe(100);
    expect(created.label).toBe("Chèque cadeau");
    expect(created.date).toEqual(parseCalendarDate("2026-10-12"));
  });

  it("rejects a non-positive amount at the database level", async () => {
    const user = await createTestUser(primaryEmail);

    await expect(
      createExtraIncome(prisma, user.id, { ...cheque(), amount: moneyFromEuros(0) }),
    ).rejects.toThrow();
  });
});

describe("findExtraIncomesByUserAndMonth", () => {
  it("returns only the user's extra incomes dated in the month (R36)", async () => {
    const user = await createTestUser(primaryEmail);
    const other = await createTestUser(otherEmail);
    await createExtraIncome(prisma, user.id, cheque("2026-10-01"));
    await createExtraIncome(prisma, user.id, cheque("2026-10-31"));
    await createExtraIncome(prisma, user.id, cheque("2026-09-30"));
    await createExtraIncome(prisma, user.id, cheque("2026-11-01"));
    await createExtraIncome(prisma, other.id, cheque("2026-10-15"));

    const found = await findExtraIncomesByUserAndMonth(prisma, user.id, parseMonth("2026-10"));

    expect(found).toHaveLength(2);
  });
});

describe("findExtraIncomeById", () => {
  it("does not return another user's extra income", async () => {
    const user = await createTestUser(primaryEmail);
    const other = await createTestUser(otherEmail);
    const created = await createExtraIncome(prisma, user.id, cheque());

    expect(await findExtraIncomeById(prisma, other.id, created.id)).toBeNull();
    expect(await findExtraIncomeById(prisma, user.id, created.id)).not.toBeNull();
  });
});

describe("updateExtraIncome", () => {
  it("updates the amount and label", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createExtraIncome(prisma, user.id, cheque());

    await updateExtraIncome(prisma, user.id, created.id, {
      ...cheque(),
      amount: moneyFromEuros(80),
      label: "Prime",
    });

    const found = await findExtraIncomeById(prisma, user.id, created.id);
    expect(found && moneyToEuros(found.amount)).toBe(80);
    expect(found?.label).toBe("Prime");
  });

  it("cannot update another user's extra income", async () => {
    const user = await createTestUser(primaryEmail);
    const other = await createTestUser(otherEmail);
    const created = await createExtraIncome(prisma, user.id, cheque());

    await expect(updateExtraIncome(prisma, other.id, created.id, cheque())).rejects.toThrow();
  });
});

describe("deleteExtraIncome", () => {
  it("deletes the user's extra income", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createExtraIncome(prisma, user.id, cheque());

    await deleteExtraIncome(prisma, user.id, created.id);

    expect(await findExtraIncomeById(prisma, user.id, created.id)).toBeNull();
  });

  it("cannot delete another user's extra income", async () => {
    const user = await createTestUser(primaryEmail);
    const other = await createTestUser(otherEmail);
    const created = await createExtraIncome(prisma, user.id, cheque());

    await expect(deleteExtraIncome(prisma, other.id, created.id)).rejects.toThrow();
    expect(await findExtraIncomeById(prisma, user.id, created.id)).not.toBeNull();
  });
});
