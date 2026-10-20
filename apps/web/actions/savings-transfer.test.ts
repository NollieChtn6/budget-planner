import {
  createSavingsTransfer,
  createTestPrismaClient,
  findSavingsTransfersByUserAndMonth,
} from "@budget/db";
import { moneyFromEuros, moneyToCents, parseCalendarDate } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { resolveCurrentMonth } from "../lib/current-month";
import { openMonthForUser } from "./month";
import {
  createSavingsTransferForUser,
  deleteSavingsTransferForUser,
  updateSavingsTransferForUser,
} from "./savings-transfer";

const prisma = createTestPrismaClient();

const primaryEmail = "savings-transfer-action-test@example.com";
const otherEmail = "savings-transfer-action-test-other@example.com";

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

describe("createSavingsTransferForUser", () => {
  it("records a transfer without a warning while the disposable income stays positive (R37)", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);

    const result = await createSavingsTransferForUser(prisma, user.id, {
      amountEuros: 40,
      date: today,
    });

    expect(result).toEqual({
      status: "success",
      message: expect.stringMatching(/^Transfert de 40,00\s€ enregistré\.$/),
    });
    const saved = await findSavingsTransfersByUserAndMonth(prisma, user.id, currentMonth);
    expect(saved).toHaveLength(1);
    expect(moneyToCents(saved[0]?.amount ?? moneyFromEuros(-1))).toBe(4000);
  });

  it("warns without blocking when the transfer exceeds the disposable income", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);

    const result = await createSavingsTransferForUser(prisma, user.id, {
      amountEuros: 5000,
      date: today,
    });

    expect(result.status).toBe("success");
    expect(result.warning).toContain("négatif");
    expect(await findSavingsTransfersByUserAndMonth(prisma, user.id, currentMonth)).toHaveLength(1);
  });

  it("rejects a transfer when the month isn't open", async () => {
    const user = await createTestUser();

    const result = await createSavingsTransferForUser(prisma, user.id, {
      amountEuros: 40,
      date: today,
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("ouvert");
  });

  it("rejects a date outside the active month", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);

    const result = await createSavingsTransferForUser(prisma, user.id, {
      amountEuros: 40,
      date: "2020-01-14",
    });

    expect(result.status).toBe("error");
    expect(result.message).toContain("mois en cours");
  });
});

describe("createSavingsTransferForUser converted urge (R38)", () => {
  it("records a converted urge that lowers the disposable income like any transfer (E19)", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);

    const result = await createSavingsTransferForUser(prisma, user.id, {
      amountEuros: 40,
      date: today,
      kind: "convertedUrge",
      label: "Pull en solde",
    });

    expect(result).toEqual({
      status: "success",
      message: expect.stringMatching(
        /^✨ Bravo : .*40.* mis de côté en renonçant à Pull en solde\.$/,
      ),
    });
    const saved = await findSavingsTransfersByUserAndMonth(prisma, user.id, currentMonth);
    expect(saved).toHaveLength(1);
    expect(saved[0]?.kind).toBe("convertedUrge");
    expect(saved[0]?.label).toBe("Pull en solde");
  });

  it("rejects a converted urge without a label", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);

    const result = await createSavingsTransferForUser(prisma, user.id, {
      amountEuros: 40,
      date: today,
      kind: "convertedUrge",
    });

    expect(result).toEqual({ status: "error", message: "Indique à quoi tu as renoncé." });
    expect(await findSavingsTransfersByUserAndMonth(prisma, user.id, currentMonth)).toHaveLength(0);
  });
});

describe("updateSavingsTransferForUser", () => {
  it("updates the user's transfer", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);
    const created = await createSavingsTransfer(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(40),
      kind: "free",
    });

    const result = await updateSavingsTransferForUser(prisma, user.id, {
      id: created.id,
      amountEuros: 25,
      date: today,
      label: "Livret A",
    });

    expect(result.status).toBe("success");
    const saved = await findSavingsTransfersByUserAndMonth(prisma, user.id, currentMonth);
    expect(saved[0]?.label).toBe("Livret A");
    expect(moneyToCents(saved[0]?.amount ?? moneyFromEuros(-1))).toBe(2500);
  });

  it("turns a free transfer into a converted urge (R38)", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);
    const created = await createSavingsTransfer(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(40),
      kind: "free",
    });

    const result = await updateSavingsTransferForUser(prisma, user.id, {
      id: created.id,
      amountEuros: 40,
      date: today,
      kind: "convertedUrge",
      label: "Pull en solde",
    });

    expect(result.status).toBe("success");
    const saved = await findSavingsTransfersByUserAndMonth(prisma, user.id, currentMonth);
    expect(saved[0]?.kind).toBe("convertedUrge");
  });

  it("cannot update another user's transfer", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser(otherEmail);
    await openMonthForUser(prisma, owner.id, 2800);
    await openMonthForUser(prisma, attacker.id, 2800);
    const created = await createSavingsTransfer(prisma, owner.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(40),
      kind: "free",
    });

    const result = await updateSavingsTransferForUser(prisma, attacker.id, {
      id: created.id,
      amountEuros: 1,
      date: today,
    });

    expect(result.status).toBe("error");
    const saved = await findSavingsTransfersByUserAndMonth(prisma, owner.id, currentMonth);
    expect(moneyToCents(saved[0]?.amount ?? moneyFromEuros(-1))).toBe(4000);
  });
});

describe("deleteSavingsTransferForUser", () => {
  it("deletes the user's transfer", async () => {
    const user = await createTestUser();
    await openMonthForUser(prisma, user.id, 2800);
    const created = await createSavingsTransfer(prisma, user.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(40),
      kind: "free",
    });

    const result = await deleteSavingsTransferForUser(prisma, user.id, created.id);

    expect(result.status).toBe("success");
    expect(await findSavingsTransfersByUserAndMonth(prisma, user.id, currentMonth)).toHaveLength(0);
  });

  it("cannot delete another user's transfer", async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser(otherEmail);
    await openMonthForUser(prisma, owner.id, 2800);
    await openMonthForUser(prisma, attacker.id, 2800);
    const created = await createSavingsTransfer(prisma, owner.id, {
      date: parseCalendarDate(today),
      amount: moneyFromEuros(40),
      kind: "free",
    });

    const result = await deleteSavingsTransferForUser(prisma, attacker.id, created.id);

    expect(result.status).toBe("error");
    expect(await findSavingsTransfersByUserAndMonth(prisma, owner.id, currentMonth)).toHaveLength(
      1,
    );
  });
});
