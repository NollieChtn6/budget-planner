import type { PrismaClient } from "@prisma/client";

/**
 * Total-lockout recovery (ADR-0008): clears TOTP enrollment so the next
 * sign-in re-triggers the forced /enroll-2fa flow. Plain Prisma, not
 * Better Auth's internal adapter: the TwoFactor table isn't exposed
 * through the generic InternalAdapter the way user/account/session are.
 */
export async function resetTwoFactor(prisma: PrismaClient, email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No user with email "${email}".`);
  }

  await prisma.twoFactor.deleteMany({ where: { userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false } });

  return user;
}

async function main() {
  await import("dotenv/config");
  const { parseArgs } = await import("node:util");
  const { prisma } = await import("@budget/db");

  const {
    values: { email },
  } = parseArgs({ options: { email: { type: "string" } } });

  if (!email) {
    console.error("Usage: pnpm reset-2fa --email <email>");
    process.exit(1);
  }

  await resetTwoFactor(prisma, email);
  console.log(`Second facteur réinitialisé pour ${email}.`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
