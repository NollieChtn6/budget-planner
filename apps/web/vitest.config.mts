import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Mirrors tsconfig.json's "@/*" path alias (Server Actions import via "@/…").
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    setupFiles: ["./vitest.setup.ts"],
    // Several test files share one real test database and each insert their
    // own fixture User row for the duration of their suite. lib/create-user
    // asserts on the table's total row count (ADR-0008: one account, ever),
    // so a concurrent file's fixture row would make it see a false positive.
    fileParallelism: false,
  },
});
