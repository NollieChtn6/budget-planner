import type { auth as AuthInstance } from "@/lib/auth";

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
};

/** Accounts the app accepts through `scripts/create-user.ts` (ADR-0008). */
export const MAX_ACCOUNTS = 2;

export class AccountLimitReachedError extends Error {
  constructor(maxAccounts: number) {
    super(
      maxAccounts === 1
        ? "Un compte existe déjà : cette application n'en accepte qu'un seul."
        : `Le nombre maximal de comptes (${maxAccounts}) est atteint.`,
    );
  }
}

export async function hasAnyUser(authInstance: Pick<typeof AuthInstance, "$context">) {
  const ctx = await authInstance.$context;
  const total = await ctx.internalAdapter.countTotalUsers();
  return total > 0;
}

/**
 * Provisions an account (ADR-0008): no public sign-up exists, so this is the
 * only way an account gets created. Uses Better Auth's internal adapter
 * directly rather than its sign-up endpoint, which is disabled
 * (`disableSignUp: true`) for both HTTP and programmatic calls.
 *
 * `maxAccounts` defaults to 1, the `/setup` route's contract: only
 * `scripts/create-user.ts` raises it, to `MAX_ACCOUNTS`.
 */
export async function createUser(
  authInstance: Pick<typeof AuthInstance, "$context">,
  input: CreateUserInput,
  { maxAccounts = 1 }: { maxAccounts?: number } = {},
) {
  const ctx = await authInstance.$context;

  if ((await ctx.internalAdapter.countTotalUsers()) >= maxAccounts) {
    throw new AccountLimitReachedError(maxAccounts);
  }

  const user = await ctx.internalAdapter.createUser(
    { name: input.name, email: input.email, emailVerified: true },
    { method: "credential" },
  );

  const passwordHash = await ctx.password.hash(input.password);
  await ctx.internalAdapter.linkAccount({
    providerId: "credential",
    accountId: user.id,
    userId: user.id,
    password: passwordHash,
  });

  return user;
}
