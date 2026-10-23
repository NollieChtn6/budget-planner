import {
  type BudgetMonth,
  moneyFromEuros,
  moneyToCents,
  nextMonth,
  parseCalendarDate,
  parseMonth,
} from "@budget/domain";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPrismaClient } from "../testing";
import { findContributionsByUserAndProvision } from "./contribution";
import { createFixedEntry } from "./fixed-entry";
import {
  closeBudgetMonth,
  createBudgetMonth,
  findBudgetMonthByMonth,
  findClosedBudgetMonthsByUser,
  findMostRecentClosedBudgetMonthByUser,
  findOldestClosedBudgetMonthByUser,
  findOpenBudgetMonthByUser,
  reopenBudgetMonth,
  replaceBudgetMonthSnapshot,
  updateSnapshotFixedEntryStatus,
} from "./month";
import { createProvision } from "./provision";
import { createVariableEnvelope } from "./variable-envelope";

const prisma = createTestPrismaClient();

const primaryEmail = "month-repo-test@example.com";
const otherEmail = "month-repo-test-other@example.com";

async function cleanup() {
  await prisma.user.deleteMany({ where: { email: { in: [primaryEmail, otherEmail] } } });
}

function createTestUser(email: string) {
  return prisma.user.create({ data: { name: "Test", email, emailVerified: true } });
}

const month = parseMonth("2026-01");

async function seedParameterization(userId: string) {
  const fixedEntry = await createFixedEntry(prisma, userId, {
    type: "charge",
    firstVersion: {
      fixedEntryId: "pending",
      effectiveFrom: month,
      label: "Loyer",
      amount: moneyFromEuros(1000),
    },
  });
  const envelope = await createVariableEnvelope(prisma, userId, {
    firstVersion: {
      envelopeId: "pending",
      effectiveFrom: month,
      label: "Vie quotidienne",
      mode: "amount",
      value: moneyFromEuros(150),
    },
  });
  const provision = await createProvision(prisma, userId, {
    type: "deadline",
    label: "Orthodontie",
    target: moneyFromEuros(400),
    startMonth: month,
    durationMonths: 6,
  });
  return { fixedEntry, envelope, provision };
}

function buildBudgetMonth(
  seed: Awaited<ReturnType<typeof seedParameterization>>,
  overrides?: Partial<BudgetMonth>,
): BudgetMonth {
  return {
    month,
    status: "open",
    income: moneyFromEuros(2800),
    fixedEntries: [
      {
        fixedEntryId: seed.fixedEntry.id,
        label: "Loyer",
        type: "charge",
        amount: moneyFromEuros(1000),
        status: "planned",
      },
    ],
    envelopeBudgets: [
      {
        envelopeId: seed.envelope.id,
        label: "Vie quotidienne",
        mode: "amount",
        value: moneyFromEuros(150),
        budget: moneyFromEuros(150),
      },
    ],
    provisionTargets: [
      { provisionId: seed.provision.id, label: "Orthodontie", target: moneyFromEuros(66.67) },
    ],
    ...overrides,
  };
}

beforeAll(cleanup);
afterEach(cleanup);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("createBudgetMonth / findBudgetMonthByMonth", () => {
  it("creates the month and all three snapshot collections, then round-trips", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);

    const created = await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    expect(created.status).toBe("open");
    expect(moneyToCents(created.income)).toBe(moneyToCents(moneyFromEuros(2800)));
    expect(created.fixedEntries).toHaveLength(1);
    expect(created.envelopeBudgets).toHaveLength(1);
    expect(created.provisionTargets).toHaveLength(1);

    const found = await findBudgetMonthByMonth(prisma, user.id, month);
    expect(found).not.toBeNull();
    expect(found?.fixedEntries[0]?.fixedEntryId).toBe(seed.fixedEntry.id);
    expect(found?.envelopeBudgets[0]?.envelopeId).toBe(seed.envelope.id);
    expect(moneyToCents(found?.provisionTargets[0]?.target ?? moneyFromEuros(-1))).toBe(6667);
  });

  it("returns null when no month exists yet", async () => {
    const user = await createTestUser(primaryEmail);
    const found = await findBudgetMonthByMonth(prisma, user.id, month);
    expect(found).toBeNull();
  });

  it("only returns the requesting user's month", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    const found = await findBudgetMonthByMonth(prisma, otherUser.id, month);
    expect(found).toBeNull();
  });

  it("rejects opening the same month twice for the same user", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    await expect(createBudgetMonth(prisma, user.id, buildBudgetMonth(seed))).rejects.toThrow();
  });
});

describe("findClosedBudgetMonthsByUser", () => {
  it("returns only closed months, most recent first", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    await createBudgetMonth(
      prisma,
      user.id,
      buildBudgetMonth(seed, { month: parseMonth("2026-02") }),
    );
    await createBudgetMonth(
      prisma,
      user.id,
      buildBudgetMonth(seed, { month: parseMonth("2026-03") }),
    );
    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });
    await closeBudgetMonth(prisma, user.id, parseMonth("2026-02"), {
      closedAt: new Date("2026-02-28T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });
    // 2026-03 stays open.

    const closedMonths = await findClosedBudgetMonthsByUser(prisma, user.id);

    expect(closedMonths.map((m) => m.month)).toEqual([parseMonth("2026-02"), month]);
  });

  it("only returns the requesting user's months", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });

    const closedMonths = await findClosedBudgetMonthsByUser(prisma, otherUser.id);
    expect(closedMonths).toHaveLength(0);
  });
});

describe("findOpenBudgetMonthByUser", () => {
  it("returns the open month", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    const open = await findOpenBudgetMonthByUser(prisma, user.id);
    expect(open?.month).toEqual(month);
  });

  it("returns null once the month is closed", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });

    const open = await findOpenBudgetMonthByUser(prisma, user.id);
    expect(open).toBeNull();
  });

  it("returns the oldest open month if the invariant is ever violated", async () => {
    // Guards R4/R26's "at most one open month" invariant: should that ever
    // be violated (as actions/month.test.ts's R33 test simulates), the query
    // must still resolve deterministically rather than depend on whatever
    // row order the database happens to produce. Insert the later month
    // first, specifically to catch any accidental reliance on insertion
    // order.
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed, { month: nextMonth(month) }));
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    const open = await findOpenBudgetMonthByUser(prisma, user.id);
    expect(open?.month).toEqual(month);
  });

  it("only returns the requesting user's open month", async () => {
    const user = await createTestUser(primaryEmail);
    const otherUser = await createTestUser(otherEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    const open = await findOpenBudgetMonthByUser(prisma, otherUser.id);
    expect(open).toBeNull();
  });
});

describe("closeBudgetMonth", () => {
  it("locks the month and records a savings + provision split, creating a closing contribution", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [
        { destination: "savings", amount: moneyFromEuros(20) },
        { destination: "provision", provisionId: seed.provision.id, amount: moneyFromEuros(30) },
      ],
      contributions: [
        {
          date: parseCalendarDate("2026-01-31"),
          amount: moneyFromEuros(30),
          provisionId: seed.provision.id,
          origin: "closing",
        },
      ],
    });

    const closed = await findBudgetMonthByMonth(prisma, user.id, month);
    expect(closed?.status).toBe("closed");

    const contributions = await findContributionsByUserAndProvision(
      prisma,
      user.id,
      seed.provision.id,
    );
    expect(contributions).toHaveLength(1);
    expect(contributions[0]?.origin).toBe("closing");
    expect(moneyToCents(contributions[0]?.amount ?? moneyFromEuros(-1))).toBe(3000);
  });

  it("closes with no allocation at all", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });

    const closed = await findBudgetMonthByMonth(prisma, user.id, month);
    expect(closed?.status).toBe("closed");
  });

  it("rejects closing a month that isn't open for this user", async () => {
    const user = await createTestUser(primaryEmail);

    await expect(
      closeBudgetMonth(prisma, user.id, month, {
        closedAt: new Date("2026-01-31T12:00:00.000Z"),
        allocations: [],
        contributions: [],
      }),
    ).rejects.toThrow();
  });
});

describe("reopenBudgetMonth", () => {
  it("unlocks a closed month", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });

    await reopenBudgetMonth(prisma, user.id, month);

    const reopened = await findBudgetMonthByMonth(prisma, user.id, month);
    expect(reopened?.status).toBe("open");
  });

  it("allows closing it again afterwards", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });
    await reopenBudgetMonth(prisma, user.id, month);

    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-02-01T09:00:00.000Z"),
      allocations: [],
      contributions: [],
    });

    const closedAgain = await findBudgetMonthByMonth(prisma, user.id, month);
    expect(closedAgain?.status).toBe("closed");
  });

  it("rejects reopening a month that isn't closed", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    await expect(reopenBudgetMonth(prisma, user.id, month)).rejects.toThrow();
  });

  it("rejects reopening another user's month", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const seed = await seedParameterization(owner.id);
    await createBudgetMonth(prisma, owner.id, buildBudgetMonth(seed));
    await closeBudgetMonth(prisma, owner.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });

    await expect(reopenBudgetMonth(prisma, attacker.id, month)).rejects.toThrow();
  });
});

describe("updateSnapshotFixedEntryStatus (R27)", () => {
  it("toggles a fixed entry's pointage to done, then back to planned", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    await updateSnapshotFixedEntryStatus(prisma, user.id, month, seed.fixedEntry.id, "done");
    expect((await findBudgetMonthByMonth(prisma, user.id, month))?.fixedEntries[0]?.status).toBe(
      "done",
    );

    await updateSnapshotFixedEntryStatus(prisma, user.id, month, seed.fixedEntry.id, "planned");
    expect((await findBudgetMonthByMonth(prisma, user.id, month))?.fixedEntries[0]?.status).toBe(
      "planned",
    );
  });

  it("rejects a fixed entry from a closed month", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });

    await expect(
      updateSnapshotFixedEntryStatus(prisma, user.id, month, seed.fixedEntry.id, "done"),
    ).rejects.toThrow();
  });

  it("rejects another user's fixed entry", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const seed = await seedParameterization(owner.id);
    await createBudgetMonth(prisma, owner.id, buildBudgetMonth(seed));

    await expect(
      updateSnapshotFixedEntryStatus(prisma, attacker.id, month, seed.fixedEntry.id, "done"),
    ).rejects.toThrow();
  });
});

describe("replaceBudgetMonthSnapshot (R7)", () => {
  it("overwrites fixed entries and envelope budgets for the open month", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    await replaceBudgetMonthSnapshot(prisma, user.id, month, {
      fixedEntries: [
        {
          fixedEntryId: seed.fixedEntry.id,
          label: "Loyer cave et appart",
          type: "charge",
          amount: moneyFromEuros(1050),
          status: "planned",
        },
      ],
      envelopeBudgets: [
        {
          envelopeId: seed.envelope.id,
          label: "Vie quotidienne",
          mode: "amount",
          value: moneyFromEuros(180),
          budget: moneyFromEuros(180),
        },
      ],
      provisionTargets: [
        { provisionId: seed.provision.id, label: "Orthodontie", target: moneyFromEuros(66.67) },
      ],
    });

    const found = await findBudgetMonthByMonth(prisma, user.id, month);
    expect(found?.fixedEntries[0]?.label).toBe("Loyer cave et appart");
    expect(moneyToCents(found?.fixedEntries[0]?.amount ?? moneyFromEuros(-1))).toBe(105000);
    expect(moneyToCents(found?.envelopeBudgets[0]?.budget ?? moneyFromEuros(-1))).toBe(18000);
    expect(found?.provisionTargets).toHaveLength(1);
  });

  it("drops a fixed entry no longer present in the replacement set", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));

    await replaceBudgetMonthSnapshot(prisma, user.id, month, {
      fixedEntries: [],
      envelopeBudgets: [
        {
          envelopeId: seed.envelope.id,
          label: "Vie quotidienne",
          mode: "amount",
          value: moneyFromEuros(150),
          budget: moneyFromEuros(150),
        },
      ],
      provisionTargets: [
        { provisionId: seed.provision.id, label: "Orthodontie", target: moneyFromEuros(66.67) },
      ],
    });

    const found = await findBudgetMonthByMonth(prisma, user.id, month);
    expect(found?.fixedEntries).toHaveLength(0);
  });

  it("adds a provision target newly present in the replacement set, and drops one no longer present", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    const newProvision = await createProvision(prisma, user.id, {
      type: "deadline",
      label: "Vacances",
      target: moneyFromEuros(700),
      startMonth: month,
      durationMonths: 10,
    });

    await replaceBudgetMonthSnapshot(prisma, user.id, month, {
      fixedEntries: buildBudgetMonth(seed).fixedEntries,
      envelopeBudgets: buildBudgetMonth(seed).envelopeBudgets,
      provisionTargets: [
        { provisionId: newProvision.id, label: "Vacances", target: moneyFromEuros(70) },
      ],
    });

    const found = await findBudgetMonthByMonth(prisma, user.id, month);
    expect(found?.provisionTargets).toHaveLength(1);
    expect(found?.provisionTargets[0]?.provisionId).toBe(newProvision.id);
    expect(moneyToCents(found?.provisionTargets[0]?.target ?? moneyFromEuros(-1))).toBe(7000);
  });

  it("rejects replacing another user's open month", async () => {
    const owner = await createTestUser(primaryEmail);
    const attacker = await createTestUser(otherEmail);
    const seed = await seedParameterization(owner.id);
    await createBudgetMonth(prisma, owner.id, buildBudgetMonth(seed));

    await expect(
      replaceBudgetMonthSnapshot(prisma, attacker.id, month, {
        fixedEntries: [],
        envelopeBudgets: [],
        provisionTargets: [],
      }),
    ).rejects.toThrow();
  });

  it("rejects replacing a closed month's snapshot", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });

    await expect(
      replaceBudgetMonthSnapshot(prisma, user.id, month, {
        fixedEntries: [],
        envelopeBudgets: [],
        provisionTargets: [],
      }),
    ).rejects.toThrow();
  });
});

describe("database constraints", () => {
  it("rejects a negative income", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);

    await expect(
      createBudgetMonth(prisma, user.id, buildBudgetMonth(seed, { income: moneyFromEuros(-1) })),
    ).rejects.toThrow();
  });

  it("rejects a month that isn't the first day of the month", async () => {
    const user = await createTestUser(primaryEmail);

    await expect(
      prisma.budgetMonth.create({
        data: {
          userId: user.id,
          month: new Date("2026-01-15T00:00:00.000Z"),
          incomeCents: 100000,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a leftover allocation whose destination/provision_id pairing is inconsistent", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    const row = await prisma.budgetMonth.findFirstOrThrow({
      where: { userId: user.id, month: new Date("2026-01-01T00:00:00.000Z") },
    });

    await expect(
      prisma.leftoverAllocation.create({
        data: {
          budgetMonthId: row.id,
          destination: "savings",
          provisionId: seed.provision.id,
          amountCents: 1000,
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a non-positive leftover allocation amount", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    const row = await prisma.budgetMonth.findFirstOrThrow({
      where: { userId: user.id, month: new Date("2026-01-01T00:00:00.000Z") },
    });

    await expect(
      prisma.leftoverAllocation.create({
        data: { budgetMonthId: row.id, destination: "savings", amountCents: 0 },
      }),
    ).rejects.toThrow();
  });
});

describe("findMostRecentClosedBudgetMonthByUser / findOldestClosedBudgetMonthByUser", () => {
  it("return the latest and earliest closed months, ignoring open ones", async () => {
    const user = await createTestUser(primaryEmail);
    const seed = await seedParameterization(user.id);
    await createBudgetMonth(prisma, user.id, buildBudgetMonth(seed));
    await createBudgetMonth(
      prisma,
      user.id,
      buildBudgetMonth(seed, { month: parseMonth("2026-02") }),
    );
    await createBudgetMonth(
      prisma,
      user.id,
      buildBudgetMonth(seed, { month: parseMonth("2026-03") }),
    );
    await closeBudgetMonth(prisma, user.id, month, {
      closedAt: new Date("2026-01-31T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });
    await closeBudgetMonth(prisma, user.id, parseMonth("2026-02"), {
      closedAt: new Date("2026-02-28T12:00:00.000Z"),
      allocations: [],
      contributions: [],
    });

    expect((await findMostRecentClosedBudgetMonthByUser(prisma, user.id))?.month).toEqual(
      parseMonth("2026-02"),
    );
    expect((await findOldestClosedBudgetMonthByUser(prisma, user.id))?.month).toEqual(month);
  });

  it("return null when the user has no closed month", async () => {
    const user = await createTestUser(primaryEmail);
    expect(await findMostRecentClosedBudgetMonthByUser(prisma, user.id)).toBeNull();
    expect(await findOldestClosedBudgetMonthByUser(prisma, user.id)).toBeNull();
  });
});
