import { createTestPrismaClient } from "@budget/db";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import { createUser } from "./create-user";
import { changePasswordWithAuth, updateNameWithAuth } from "./profile";

const prisma = createTestPrismaClient();
const auth = createAuth(prisma);

const email = "profile-test@example.com";
const password = "correct horse battery staple";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email } });
}

async function signIn(pwd: string) {
  const { headers } = await auth.api.signInEmail({
    body: { email, password: pwd },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("updateNameWithAuth", () => {
  it("renames the signed-in user, trimming the name", async () => {
    const user = await createUser(auth, { name: "Jane", email, password });
    const result = await updateNameWithAuth(auth, await signIn(password), { name: "  Joan  " });

    expect(result.status).toBe("success");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe("Joan");
  });

  it("rejects an empty or too long name", async () => {
    await createUser(auth, { name: "Jane", email, password });
    const headers = await signIn(password);

    expect((await updateNameWithAuth(auth, headers, { name: "   " })).status).toBe("error");
    expect((await updateNameWithAuth(auth, headers, { name: "a".repeat(51) })).status).toBe(
      "error",
    );
  });

  it("refuses a request without a session", async () => {
    const user = await createUser(auth, { name: "Jane", email, password });
    const result = await updateNameWithAuth(auth, new Headers(), { name: "Joan" });

    expect(result.status).toBe("error");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).name).toBe("Jane");
  });
});

describe("changePasswordWithAuth", () => {
  const valid = {
    currentPassword: password,
    newPassword: "a brand new passphrase",
    confirmPassword: "a brand new passphrase",
  };

  it("changes the password and keeps only the current session", async () => {
    const user = await createUser(auth, { name: "Jane", email, password });
    const headers = await signIn(password);
    await signIn(password);

    const result = await changePasswordWithAuth(auth, headers, valid);

    expect(result.status).toBe("success");
    const account = await prisma.account.findFirstOrThrow({ where: { userId: user.id } });
    const ctx = await auth.$context;
    await expect(
      ctx.password.verify({ hash: account.password ?? "", password: valid.newPassword }),
    ).resolves.toBe(true);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
  });

  it("refuses a wrong current password and leaves the hash untouched", async () => {
    const user = await createUser(auth, { name: "Jane", email, password });
    const before = await prisma.account.findFirstOrThrow({ where: { userId: user.id } });

    const result = await changePasswordWithAuth(auth, await signIn(password), {
      ...valid,
      currentPassword: "not the password",
    });

    expect(result).toEqual({ status: "error", message: "Le mot de passe actuel est incorrect." });
    const after = await prisma.account.findFirstOrThrow({ where: { userId: user.id } });
    expect(after.password).toBe(before.password);
  });

  it("refuses a new password identical to the current one", async () => {
    await createUser(auth, { name: "Jane", email, password });
    const result = await changePasswordWithAuth(auth, await signIn(password), {
      currentPassword: password,
      newPassword: password,
      confirmPassword: password,
    });

    expect(result.status).toBe("error");
  });

  it("refuses a confirmation that differs or a too short password", async () => {
    await createUser(auth, { name: "Jane", email, password });
    const headers = await signIn(password);

    expect(
      (await changePasswordWithAuth(auth, headers, { ...valid, confirmPassword: "other" })).status,
    ).toBe("error");
    expect(
      (
        await changePasswordWithAuth(auth, headers, {
          ...valid,
          newPassword: "short",
          confirmPassword: "short",
        })
      ).status,
    ).toBe("error");
  });

  it("refuses a request without a session", async () => {
    await createUser(auth, { name: "Jane", email, password });
    const result = await changePasswordWithAuth(auth, new Headers(), valid);

    expect(result.status).toBe("error");
  });
});
