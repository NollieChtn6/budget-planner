import type { auth as AuthInstance } from "@/lib/auth";

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
};

export class AccountAlreadyExistsError extends Error {
  constructor() {
    super("Un compte existe déjà : cette application n'en accepte qu'un seul.");
  }
}

/** Shared by `scripts/create-user.ts` (accès shell) and the `/setup` route (sans accès shell). */
export async function hasAnyUser(authInstance: Pick<typeof AuthInstance, "$context">) {
  const ctx = await authInstance.$context;
  const total = await ctx.internalAdapter.countTotalUsers();
  return total > 0;
}

/**
 * Provisions the single account for this app (ADR-0008): no public sign-up
 * exists, so this is the only way an account gets created. Uses Better
 * Auth's internal adapter directly rather than its sign-up endpoint, which
 * is disabled (`disableSignUp: true`) for both HTTP and programmatic calls.
 */
export async function createUser(
  authInstance: Pick<typeof AuthInstance, "$context">,
  input: CreateUserInput,
) {
  const ctx = await authInstance.$context;

  if (await hasAnyUser(authInstance)) {
    throw new AccountAlreadyExistsError();
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
