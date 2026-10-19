import { moneyFromEuros, moneyToEuros, parseCalendarDate, parseMonth } from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import {
  createSavingsTransfer,
  deleteSavingsTransfer,
  findSavingsTransferById,
  findSavingsTransfersByUserAndMonth,
  updateSavingsTransfer,
} from "./savings-transfer";

const prisma = createTestPrismaClient();

const primaryEmail = "savings-transfer-repo-test@example.com";
const otherEmail = "savings-transfer-repo-test-other@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [primaryEmail, otherEmail] } } });
}

function createTestUser(email: string) {
  return prisma.user.create({ data: { name: "Test", email, emailVerified: true } });
}

function transfer(date = "2026-10-12") {
  return { date: parseCalendarDate(date), amount: moneyFromEuros(40) };
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createSavingsTransfer", () => {
  it("round-trips a transfer with and without a label", async () => {
    const user = await createTestUser(primaryEmail);

    const plain = await createSavingsTransfer(prisma, user.id, transfer());
    const labelled = await createSavingsTransfer(prisma, user.id, {
      ...transfer(),
      label: "Livret A",
    });

    expect(moneyToEuros(plain.amount)).toBe(40);
    expect("label" in plain).toBe(false);
    expect(labelled.label).toBe("Livret A");
  });

  it("rejects a non-positive amount at the database level", async () => {
    const user = await createTestUser(primaryEmail);

    await expect(
      createSavingsTransfer(prisma, user.id, { ...transfer(), amount: moneyFromEuros(0) }),
    ).rejects.toThrow();
  });
});

describe("findSavingsTransfersByUserAndMonth", () => {
  it("returns only the user's transfers dated in the month (R37)", async () => {
    const user = await createTestUser(primaryEmail);
    const other = await createTestUser(otherEmail);
    await createSavingsTransfer(prisma, user.id, transfer("2026-10-01"));
    await createSavingsTransfer(prisma, user.id, transfer("2026-10-31"));
    await createSavingsTransfer(prisma, user.id, transfer("2026-09-30"));
    await createSavingsTransfer(prisma, user.id, transfer("2026-11-01"));
    await createSavingsTransfer(prisma, other.id, transfer("2026-10-15"));

    const found = await findSavingsTransfersByUserAndMonth(prisma, user.id, parseMonth("2026-10"));

    expect(found).toHaveLength(2);
  });
});

describe("findSavingsTransferById", () => {
  it("does not return another user's transfer", async () => {
    const user = await createTestUser(primaryEmail);
    const other = await createTestUser(otherEmail);
    const created = await createSavingsTransfer(prisma, user.id, transfer());

    expect(await findSavingsTransferById(prisma, other.id, created.id)).toBeNull();
    expect(await findSavingsTransferById(prisma, user.id, created.id)).not.toBeNull();
  });
});

describe("updateSavingsTransfer", () => {
  it("updates the amount and clears the label", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createSavingsTransfer(prisma, user.id, {
      ...transfer(),
      label: "Livret A",
    });

    await updateSavingsTransfer(prisma, user.id, created.id, {
      ...transfer(),
      amount: moneyFromEuros(25),
    });

    const found = await findSavingsTransferById(prisma, user.id, created.id);
    expect(found && moneyToEuros(found.amount)).toBe(25);
    expect(found && "label" in found).toBe(false);
  });

  it("cannot update another user's transfer", async () => {
    const user = await createTestUser(primaryEmail);
    const other = await createTestUser(otherEmail);
    const created = await createSavingsTransfer(prisma, user.id, transfer());

    await expect(updateSavingsTransfer(prisma, other.id, created.id, transfer())).rejects.toThrow();
  });
});

describe("deleteSavingsTransfer", () => {
  it("deletes the user's transfer", async () => {
    const user = await createTestUser(primaryEmail);
    const created = await createSavingsTransfer(prisma, user.id, transfer());

    await deleteSavingsTransfer(prisma, user.id, created.id);

    expect(await findSavingsTransferById(prisma, user.id, created.id)).toBeNull();
  });

  it("cannot delete another user's transfer", async () => {
    const user = await createTestUser(primaryEmail);
    const other = await createTestUser(otherEmail);
    const created = await createSavingsTransfer(prisma, user.id, transfer());

    await expect(deleteSavingsTransfer(prisma, other.id, created.id)).rejects.toThrow();
    expect(await findSavingsTransferById(prisma, user.id, created.id)).not.toBeNull();
  });
});
