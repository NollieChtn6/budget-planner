import type { Money, Month, Provision } from "@budget/domain";
import { computeProvisionBalance, moneyFromCents, moneyToCents } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { monthToDate } from "../mappers/month";
import { toDomainProvision, toPrismaProvisionData } from "../mappers/provision";

export async function findProvisionsByUser(
  prisma: PrismaClient,
  userId: string,
): Promise<Provision[]> {
  const rows = await prisma.provision.findMany({ where: { userId } });
  return rows.map(toDomainProvision);
}

/**
 * Every provision's balance (docs/domain/model.md) in two aggregate queries,
 * instead of loading each provision's whole contribution and expense history.
 * Provisions with no contribution nor expense are absent: their balance is 0.
 */
export async function findProvisionBalancesByUser(
  prisma: PrismaClient,
  userId: string,
): Promise<Map<string, Money>> {
  const [contributionTotals, expenseTotals] = await Promise.all([
    prisma.contribution.groupBy({
      by: ["provisionId"],
      where: { userId },
      _sum: { amountCents: true },
    }),
    prisma.expense.groupBy({
      by: ["provisionId"],
      where: { userId, provisionId: { not: null } },
      _sum: { amountCents: true, savingsDrawCents: true },
    }),
  ]);

  const contributionsByProvision = new Map(
    contributionTotals.map((row) => [row.provisionId, row._sum.amountCents ?? 0]),
  );
  const expensesByProvision = new Map(
    expenseTotals.flatMap((row) =>
      row.provisionId === null ? [] : [[row.provisionId, row._sum] as const],
    ),
  );

  const balances = new Map<string, Money>();
  for (const provisionId of new Set([
    ...contributionsByProvision.keys(),
    ...expensesByProvision.keys(),
  ])) {
    const expenseSum = expensesByProvision.get(provisionId);
    balances.set(
      provisionId,
      computeProvisionBalance(
        [moneyFromCents(contributionsByProvision.get(provisionId) ?? 0)],
        [
          {
            amount: moneyFromCents(expenseSum?.amountCents ?? 0),
            savingsDraw: moneyFromCents(expenseSum?.savingsDrawCents ?? 0),
          },
        ],
      ),
    );
  }
  return balances;
}

export async function findProvisionById(
  prisma: PrismaClient,
  userId: string,
  provisionId: string,
): Promise<Provision | null> {
  const row = await prisma.provision.findFirst({ where: { id: provisionId, userId } });
  return row ? toDomainProvision(row) : null;
}

export type CreateProvisionInput =
  | { type: "deadline"; label: string; target: Money; startMonth: Month; durationMonths: number }
  | { type: "reserve"; label: string; target: Money; monthlyAmount: Money };

export async function createProvision(
  prisma: PrismaClient,
  userId: string,
  input: CreateProvisionInput,
): Promise<Provision> {
  const data = toPrismaProvisionData(
    input.type === "deadline"
      ? {
          id: "pending",
          status: "active",
          type: "deadline",
          label: input.label,
          target: input.target,
          startMonth: input.startMonth,
          durationMonths: input.durationMonths,
        }
      : {
          id: "pending",
          status: "active",
          type: "reserve",
          label: input.label,
          target: input.target,
          monthlyAmount: input.monthlyAmount,
        },
  );
  const row = await prisma.provision.create({ data: { userId, ...data } });
  return toDomainProvision(row);
}

export type UpdateProvisionGoalInput =
  | { type: "deadline"; target: Money; durationMonths: number }
  | { type: "reserve"; target: Money; monthlyAmount: Money };

/**
 * Replaces target/durationMonths or target/monthlyAmount directly — Provision
 * isn't versioned (see issue #9), unlike FixedEntry/VariableEnvelope, so
 * there's no effective-dating and no child version row to upsert.
 */
export async function updateProvisionGoal(
  prisma: PrismaClient,
  userId: string,
  provisionId: string,
  input: UpdateProvisionGoalInput,
): Promise<Provision> {
  const data =
    input.type === "deadline"
      ? { targetCents: moneyToCents(input.target), durationMonths: input.durationMonths }
      : {
          targetCents: moneyToCents(input.target),
          monthlyAmountCents: moneyToCents(input.monthlyAmount),
        };

  const updated = await prisma.provision.updateMany({ where: { id: provisionId, userId }, data });
  if (updated.count === 0) {
    throw new Error(`Provision ${provisionId} not found for this user`);
  }

  const result = await findProvisionById(prisma, userId, provisionId);
  if (!result) {
    throw new Error(`Provision ${provisionId} not found for this user`);
  }
  return result;
}

/** R23 "Clôturer": ends this provision's own lifecycle (status), independent of archiving (R8). */
export async function closeProvision(
  prisma: PrismaClient,
  userId: string,
  provisionId: string,
): Promise<void> {
  const updated = await prisma.provision.updateMany({
    where: { id: provisionId, userId },
    data: { status: "closed", closedAt: new Date() },
  });
  if (updated.count === 0) {
    throw new Error(`Provision ${provisionId} not found for this user`);
  }
}

export type RenewProvisionInput = {
  label: string;
  type: "deadline";
  target: Money;
  startMonth: Month;
  durationMonths: number;
};

/** R23 "Renouveler": closes the current cycle and creates its successor in one transaction. */
export async function renewProvision(
  prisma: PrismaClient,
  userId: string,
  provisionId: string,
  newProvision: RenewProvisionInput,
): Promise<Provision> {
  const created = await prisma.$transaction(async (tx) => {
    const updated = await tx.provision.updateMany({
      where: { id: provisionId, userId },
      data: { status: "closed", closedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new Error(`Provision ${provisionId} not found for this user`);
    }

    return tx.provision.create({
      data: {
        userId,
        ...toPrismaProvisionData({
          id: "pending",
          status: "active",
          type: "deadline",
          label: newProvision.label,
          target: newProvision.target,
          startMonth: newProvision.startMonth,
          durationMonths: newProvision.durationMonths,
        }),
        previousCycleId: provisionId,
      },
    });
  });

  return toDomainProvision(created);
}

/** R20: the due month closed without the provision being complete. */
export async function markProvisionLate(
  prisma: PrismaClient,
  userId: string,
  provisionId: string,
): Promise<void> {
  const updated = await prisma.provision.updateMany({
    where: { id: provisionId, userId },
    data: { status: "late" },
  });
  if (updated.count === 0) {
    throw new Error(`Provision ${provisionId} not found for this user`);
  }
}

/** R20 "Prolonger": pushes the due month back and returns the provision to active. */
export async function extendProvisionDeadline(
  prisma: PrismaClient,
  userId: string,
  provisionId: string,
  durationMonths: number,
): Promise<Provision> {
  const updated = await prisma.provision.updateMany({
    where: { id: provisionId, userId },
    data: { durationMonths, status: "active" },
  });
  if (updated.count === 0) {
    throw new Error(`Provision ${provisionId} not found for this user`);
  }

  const result = await findProvisionById(prisma, userId, provisionId);
  if (!result) {
    throw new Error(`Provision ${provisionId} not found for this user`);
  }
  return result;
}

export async function setProvisionArchivedFrom(
  prisma: PrismaClient,
  userId: string,
  provisionId: string,
  archivedFrom: Month | null,
): Promise<Provision> {
  const updated = await prisma.provision.updateMany({
    where: { id: provisionId, userId },
    data: { archivedFrom: archivedFrom ? monthToDate(archivedFrom) : null },
  });
  if (updated.count === 0) {
    throw new Error(`Provision ${provisionId} not found for this user`);
  }

  const result = await findProvisionById(prisma, userId, provisionId);
  if (!result) {
    throw new Error(`Provision ${provisionId} not found for this user`);
  }
  return result;
}
