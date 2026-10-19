import {
  createExtraIncome,
  createTestPrismaClient,
  findExtraIncomesByUserAndMonth,
} from "@budget/db";
import { moneyFromEuros, moneyToCents, parseCalendarDate } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveCurrentMonth } from "../lib/current-month";
import {
  createExtraIncomeForUser,
  deleteExtraIncomeForUser,
  updateExtraIncomeForUser,
} from "./extra-income";
import { openMonthForUser } from "./month";

const prisma = createTestPrismaClient();

const primaryEmail = "extra-income-action-test@example.com";
const otherEmail = "extra-income-action-test-other@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [primaryEmail, otherEmail] } } });
}

function createTestUser(email = primaryEmail) {
  return prisma.user.create({ data: { name: "Test", email, emailVerified: true } });
}

const currentMonth = resolveCurrentMonth();
const today = `${currentMonth.year.toString().padStart(4, "0")}-${currentMonth.monthNumber
  .toString()
  .padStart(2, "0")}-05`;

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createExtraIncomeForUser", () => {
  it("records an extra income on its date of receipt (R36)", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);

    const result = await createExtraIncomeForUser(prisma, user.id, {
      amountEuros: 100,
      date: today,
      label: "Chèque cadeau",
    });

    expect(result).toEqual({ status: "success", message: "Entrée exceptionnelle enregistrée." });
    const saved = await findExtraIncomesByUserAndMonth(prisma, user.id, currentMonth);
    expect(saved).toHaveLength(1);
    expect(moneyToCents(saved[0]?.amount ?? moneyFromEuros(-1))).toBe(10000);
  });

  it("rejects an extra income when the month isn't open", async () => {
    const user = await createTestUser();

    const result = await createExtraIncomeForUser(prisma, user.id, {
      amountEuros: 100,
      date: today,
      label: "Chèque cadeau",
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("ouvert");
  });

  it("rejects a date outside the active month", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);

    const result = await createExtraIncomeForUser(prisma, user.id, {
      amountEuros: 100,
      date: "2020-01-14",
      label: "Chèque cadeau",
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("mois en cours");
  });

  it("rejects an empty label", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);

    const result = await createExtraIncomeForUser(prisma, user.id, {
      amountEuros: 100,
      date: today,
      label: "  ",
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("libellé");
  });
});

describe("updateExtraIncomeForUser", () => {
  it("updates the user's extra income", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);
    const created = await createExtraIncome(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(100),
      label: "Chèque cadeau",
    });

    const result = await updateExtraIncomeForUser(prisma, user.id, {
      id: created.id,
      amountEuros: 80,
      date: today,
      label: "Prime",
    });

    expect(result.status).toBe("success");
    const saved = await findExtraIncomesByUserAndMonth(prisma, user.id, currentMonth);
    expect(saved[0]?.label).toBe("Prime");
    expect(moneyToCents(saved[0]?.amount ?? moneyFromEuros(-1))).toBe(8000);
  });

  it("cannot update another user's extra income", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser(otherEmail);
    await openMonthForUser(prisma, owner.id, 2800);
    await openMonthForUser(prisma, attacker.id, 2800);
    const created = await createExtraIncome(prisma, owner.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(100),
      label: "Chèque cadeau",
    });

    const result = await updateExtraIncomeForUser(prisma, attacker.id, {
      id: created.id,
      amountEuros: 1,
      date: today,
      label: "Volé",
    });

    expect(result.status).toBe("error");
    const saved = await findExtraIncomesByUserAndMonth(prisma, owner.id, currentMonth);
    expect(saved[0]?.label).toBe("Chèque cadeau");
  });
});

describe("deleteExtraIncomeForUser", () => {
  it("deletes the user's extra income", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);
    const created = await createExtraIncome(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(100),
      label: "Chèque cadeau",
    });

    const result = await deleteExtraIncomeForUser(prisma, user.id, created.id);

    expect(result.status).toBe("success");
    expect(await findExtraIncomesByUserAndMonth(prisma, user.id, currentMonth)).toHaveLength(0);
  });

  it("cannot delete another user's extra income", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser(otherEmail);
    await openMonthForUser(prisma, owner.id, 2800);
    await openMonthForUser(prisma, attacker.id, 2800);
    const created = await createExtraIncome(prisma, owner.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(100),
      label: "Chèque cadeau",
    });

    const result = await deleteExtraIncomeForUser(prisma, attacker.id, created.id);

    expect(result.status).toBe("error");
    expect(await findExtraIncomesByUserAndMonth(prisma, owner.id, currentMonth)).toHaveLength(1);
  });
});
