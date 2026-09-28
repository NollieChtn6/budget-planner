import { PrismaClient } from "@prisma/client";

export function createTestPrismaClient(): PrismaClient {
  const datasourceUrl = process.env.TEST_DATABASE_URL;
  if (!datasourceUrl) {
    throw new Error("TEST_DATABASE_URL must be set to run tests that hit the database.");
  }
  return new PrismaClient({ datasourceUrl });
}
