import type { auth as AuthInstance } from "@/lib/auth";

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
};

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

  const existing = await ctx.internalAdapter.findUserByEmail(input.email);
  if (existing) {
    throw new Error(`A user with email "${input.email}" already exists.`);
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

async function main() {
  await import("dotenv/config");
  const { parseArgs } = await import("node:util");
  const { auth } = await import("@/lib/auth");
  const { promptHidden } = await import("./lib/prompt");

  const {
    values: { name, email },
  } = parseArgs({
    options: {
      name: { type: "string" },
      email: { type: "string" },
    },
  });

  if (!name || !email) {
    console.error("Usage: pnpm create-user --name <prénom> --email <email>");
    process.exit(1);
  }

  const password = await promptHidden("Mot de passe : ");

  const user = await createUser(auth, { name, email, password });
  console.log(`Compte créé pour ${user.email} (id ${user.id}).`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
