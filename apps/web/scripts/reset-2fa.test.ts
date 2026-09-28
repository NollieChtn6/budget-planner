import { createTestPrismaClient } from "@budget/db";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "../lib/auth";
import { createUser } from "./create-user";
import { resetTwoFactor } from "./reset-2fa";

const prisma = createTestPrismaClient();
const auth = createAuth(prisma);

const email = "reset-2fa-test@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email } });
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

async function seedEnrolledUser() {
  const user = await createUser(auth, {
    name: "Jane",
    email,
    password: "correct horse battery staple",
  });
  await prisma.twoFactor.create({
    data: { userId: user.id, secret: "secret", backupCodes: "codes" },
  });
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  return user;
}

describe("resetTwoFactor", () => {
  it("clears twoFactorEnabled and deletes the TwoFactor row", async () => {
    const user = await seedEnrolledUser();

    await resetTwoFactor(prisma, email);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.twoFactorEnabled).toBe(false);

    const twoFactorRows = await prisma.twoFactor.findMany({ where: { userId: user.id } });
    expect(twoFactorRows).toHaveLength(0);
  });

  it("throws for an email with no account", async () => {
    await expect(resetTwoFactor(prisma, "nobody@example.com")).rejects.toThrow();
  });
});
