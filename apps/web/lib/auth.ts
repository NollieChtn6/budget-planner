import { prisma } from "@budget/db";
import { hash, verify } from "@node-rs/argon2";
import type { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";

/**
 * Factory rather than a bare instance so tests can point the same
 * configuration at a different database (see scripts/create-user.test.ts).
 */
export function createAuth(prismaClient: PrismaClient) {
  return betterAuth({
    appName: "Budget Planner",
    database: prismaAdapter(prismaClient, { provider: "postgresql" }),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : undefined,
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    emailAndPassword: {
      enabled: true,
      // Pas d'inscription publique (ADR-0008) : le compte unique est créé par
      // scripts/create-user.ts via l'API interne de Better Auth, pas ce endpoint.
      disableSignUp: true,
      password: {
        hash: (password) => hash(password),
        verify: ({ hash: passwordHash, password }) => verify(passwordHash, password),
      },
    },
    // nextCookies must stay last: it lets Server Actions set the session cookie.
    plugins: [twoFactor(), nextCookies()],
  });
}

export const auth = createAuth(prisma);
