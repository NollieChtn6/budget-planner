import { createUser } from "@/lib/create-user";

async function main() {
  const { config } = await import("dotenv");
  config();
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
