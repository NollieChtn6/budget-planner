import { createTestPrismaClient } from "@budget/db";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import { AccountAlreadyExistsError, createUser, hasAnyUser } from "./create-user";

const prisma = createTestPrismaClient();
const auth = createAuth(prisma);

const email = "create-user-test@example.com";
const otherEmail = "create-user-test-2@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [email, otherEmail] } } });
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createUser", () => {
  it("creates a verified user with the password hash on Account, not User", async () => {
    const user = await createUser(auth, {
      name: "Jane",
      email,
      password: "correct horse battery staple",
    });

    expect(user.email).toBe(email);
    expect(user.emailVerified).toBe(true);
    expect(user.twoFactorEnabled).toBeFalsy();

    const account = await prisma.account.findFirst({ where: { userId: user.id } });
    expect(account?.providerId).toBe("credential");
    expect(account?.password).toBeTruthy();
    expect(account?.password).not.toBe("correct horse battery staple");

    const storedUser = await prisma.user.findUnique({ where: { id: user.id } });
    expect(storedUser).not.toHaveProperty("password");
  });

  it("hashes the password so it verifies through Better Auth's own configured verify function", async () => {
    const password = "correct horse battery staple";
    const user = await createUser(auth, { name: "Jane", email, password });
    const account = await prisma.account.findFirstOrThrow({ where: { userId: user.id } });

    const ctx = await auth.$context;
    await expect(ctx.password.verify({ hash: account.password ?? "", password })).resolves.toBe(
      true,
    );
  });

  it("rejects creating a second user with the same email", async () => {
    await createUser(auth, { name: "Jane", email, password: "correct horse battery staple" });

    await expect(
      createUser(auth, { name: "Jane again", email, password: "another password" }),
    ).rejects.toThrow(AccountAlreadyExistsError);
  });

  it("rejects creating a second user with a different email (ADR-0008: one account only)", async () => {
    await createUser(auth, { name: "Jane", email, password: "correct horse battery staple" });

    await expect(
      createUser(auth, { name: "Someone else", email: otherEmail, password: "another password" }),
    ).rejects.toThrow(AccountAlreadyExistsError);
  });
});

describe("hasAnyUser", () => {
  it("reflects whether any account exists, regardless of email", async () => {
    await expect(hasAnyUser(auth)).resolves.toBe(false);

    await createUser(auth, { name: "Jane", email, password: "correct horse battery staple" });

    await expect(hasAnyUser(auth)).resolves.toBe(true);
  });
});
