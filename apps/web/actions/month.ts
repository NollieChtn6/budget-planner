"use server";

import {
  closeBudgetMonth,
  createBudgetMonth,
  findBudgetMonthByMonth,
  findContributionsByUserAndProvision,
  findExpensesByUserAndProvision,
  findFixedEntriesByUser,
  findProvisionsByUser,
  findVariableEnvelopesByUser,
  prisma,
  reopenBudgetMonth,
} from "@budget/db";
import {
  type CloseMonthFailure,
  closeMonth,
  computeProvisionBalance,
  formatMonth,
  type LeftoverAllocationInput,
  moneyFromEuros,
  openMonth,
  parseCalendarDate,
  previousMonth,
  type ReopenMonthFailure,
  reopenMonth,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import { closeMonthSchema, openMonthSchema } from "@/schemas/month";

/**
 * Session-free core: takes userId and the Prisma client explicitly so it can
 * be unit-tested against a real test database without a Next.js request
 * context — the same split as `createAuth`/`createUser` use for Better Auth
 * elsewhere in this app, since `requireSession()` depends on `next/headers`.
 */
export async function openMonthForUser(
  prismaClient: PrismaClient,
  userId: string,
  incomeEuros: number,
): Promise<VariableEnvelopeActionState> {
  let income: ReturnType<typeof moneyFromEuros>;
  try {
    income = moneyFromEuros(incomeEuros);
  } catch {
    return { status: "error", message: "Montant invalide (centimes uniquement)." };
  }

  // The month is never taken from client input (route segment or form
  // field): only the server-resolved real current month can ever be opened
  // (V1 has no multi-month navigation — see issue #11).
  const currentMonth = resolveCurrentMonth();

  const existing = await findBudgetMonthByMonth(prismaClient, userId, currentMonth);
  if (existing) {
    return { status: "error", message: "Ce mois est déjà ouvert." };
  }

  const [previousMonthRow, fixedEntries, envelopes, provisions] = await Promise.all([
    findBudgetMonthByMonth(prismaClient, userId, previousMonth(currentMonth)),
    findFixedEntriesByUser(prismaClient, userId),
    findVariableEnvelopesByUser(prismaClient, userId),
    findProvisionsByUser(prismaClient, userId),
  ]);

  // R18/R21's starting point: each provision's real balance from every
  // contribution and provision-expense ever recorded against it, not just
  // this very first opening's (necessarily empty) history.
  const provisionsWithBalance = await Promise.all(
    provisions.map(async (provision) => {
      const [contributions, expenses] = await Promise.all([
        findContributionsByUserAndProvision(prismaClient, userId, provision.id),
        findExpensesByUserAndProvision(prismaClient, userId, provision.id),
      ]);
      return {
        ...provision,
        balance: computeProvisionBalance(
          contributions.map((c) => c.amount),
          expenses,
        ),
      };
    }),
  );

  const result = openMonth({
    month: currentMonth,
    income,
    previousMonthStatus: previousMonthRow ? previousMonthRow.status : "none",
    fixedEntries,
    envelopes,
    provisions: provisionsWithBalance,
  });

  if (!result.ok) {
    return { status: "error", message: "Le mois précédent n'est pas encore clôturé." };
  }

  await createBudgetMonth(prismaClient, userId, result.budgetMonth);
  return { status: "success", message: "Mois ouvert." };
}

export async function openMonthAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = openMonthSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await openMonthForUser(prisma, session.user.id, parsed.data.incomeEuros);
  if (result.status === "success") {
    // revalidatePath needs a Next.js request context, unlike openMonthForUser
    // above — kept here so the core stays testable (see its doc comment).
    revalidatePath(`/months/${formatMonth(resolveCurrentMonth())}`);
  }
  return result;
}

function describeCloseMonthFailure(error: CloseMonthFailure): string {
  switch (error.type) {
    case "invalidAllocationAmount":
      return "Saisis un montant supérieur à 0 pour chaque répartition.";
    case "provisionNotInSnapshot":
      return "Cette provision ne fait pas partie du budget de ce mois.";
  }
}

export type CloseMonthAllocationInput = {
  destination: "savings" | "provision";
  provisionId: string;
  amountEuros: number;
};

/**
 * Session-free core, same split as `openMonthForUser` above. R25: a
 * provision split is dated the day of the closing itself — never a date the
 * client supplies, like `date` is never taken from client input for the
 * month being closed (see `resolveCurrentMonth`'s own comment).
 */
export async function closeMonthForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: { allocations: CloseMonthAllocationInput[] },
): Promise<VariableEnvelopeActionState> {
  const closedAt = new Date();
  const date = parseCalendarDate(closedAt.toISOString().slice(0, 10));

  const currentMonth = resolveCurrentMonth();
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, currentMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: "Le mois n'est pas ouvert." };
  }

  // A blank or 0 row means "nothing allocated here", not an error (R25
  // never requires every destination to be filled).
  const allocations: LeftoverAllocationInput[] = input.allocations.flatMap(
    (allocation): LeftoverAllocationInput[] => {
      if (allocation.amountEuros <= 0) return [];
      let amount: ReturnType<typeof moneyFromEuros>;
      try {
        amount = moneyFromEuros(allocation.amountEuros);
      } catch {
        return [];
      }
      return allocation.destination === "savings"
        ? [{ destination: "savings", amount }]
        : [{ destination: "provision", provisionId: allocation.provisionId, amount }];
    },
  );

  const result = closeMonth({
    date,
    allocations,
    snapshotProvisionIds: budgetMonth.provisionTargets.map((entry) => entry.provisionId),
  });

  if (!result.ok) {
    return { status: "error", message: describeCloseMonthFailure(result.error) };
  }

  await closeBudgetMonth(prismaClient, userId, currentMonth, {
    closedAt,
    allocations: result.allocations,
    contributions: result.contributions,
  });
  return { status: "success", message: "Mois clôturé." };
}

export async function closeMonthAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = closeMonthSchema.safeParse({
    allocations: formData.getAll("allocationDestination").map((destination, index) => ({
      destination,
      provisionId: formData.getAll("allocationProvisionId")[index],
      amountEuros: formData.getAll("allocationAmountEuros")[index],
    })),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await closeMonthForUser(prisma, session.user.id, parsed.data);
  if (result.status === "success") {
    revalidatePath(`/months/${formatMonth(resolveCurrentMonth())}`);
  }
  return result;
}

function describeReopenMonthFailure(_error: ReopenMonthFailure): string {
  return "Ce mois n'est pas clôturé.";
}

/** Session-free core, same split as `openMonthForUser` above. */
export async function reopenMonthForUser(
  prismaClient: PrismaClient,
  userId: string,
): Promise<VariableEnvelopeActionState> {
  const currentMonth = resolveCurrentMonth();
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, currentMonth);

  const result = reopenMonth(budgetMonth?.status ?? "open");
  if (!result.ok) {
    return { status: "error", message: describeReopenMonthFailure(result.error) };
  }

  await reopenBudgetMonth(prismaClient, userId, currentMonth);
  return { status: "success", message: "Mois réouvert." };
}

export async function reopenMonthAction(
  _prevState: VariableEnvelopeActionState,
  _formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const result = await reopenMonthForUser(prisma, session.user.id);
  if (result.status === "success") {
    revalidatePath(`/months/${formatMonth(resolveCurrentMonth())}`);
  }
  return result;
}
