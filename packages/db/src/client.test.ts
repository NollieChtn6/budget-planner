import { describe, expect, it } from "vitest";
import { prisma } from "./client";

describe("prisma client", () => {
  it("exposes the Prisma Client API", () => {
    expect(typeof prisma.$connect).toBe("function");
    expect(typeof prisma.$disconnect).toBe("function");
  });
});
