"use server";

import {
  closeBudgetMonth,
  createBudgetMonth,
  findBudgetMonthByMonth,
  findFixedEntriesByUser,
  findLeftoverAllocationsByUserAndMonth,
  findMostRecentClosedBudgetMonthByUser,
  findOpenBudgetMonthByUser,
  findProvisionBalancesByUser,
  findProvisionsByUser,
  findVariableEnvelopesByUser,
  markProvisionLate,
  prisma,
  reopenBudgetMonth,
  updateSnapshotFixedEntryStatus,
} from "@budget/db";
import {
  activeVersionAt,
  becomesLateAtMonthClose,
  type CloseMonthFailure,
  closeMonth,
  computeCarriedOver,
  dueMonth,
  isSameMonth,
  type LeftoverAllocationInput,
  type Month,
  moneyFromCents,
  moneyFromEuros,
  nextMonth,
  openMonth,
  type PointFixedEntryFailure,
  parseCalendarDate,
  pointFixedEntry,
  previousMonth,
  type ReopenMonthFailure,
  reopenMonth,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { INVALID_AMOUNT, MONTH_NOT_OPEN } from "@/actions/messages";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveActiveMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import { describeInvalidInput } from "@/schemas/describe-invalid-input";
import { closeMonthSchema, openMonthSchema, pointFixedEntrySchema } from "@/schemas/month";

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
    return { status: "error", message: INVALID_AMOUNT };
  }

  // The active month (glossary.md's `activeMonth`), never a route segment or
  // other client-supplied value: the oldest unclosed month is the only one
  // that can ever be opened next (R4).
  const activeMonth = await resolveActiveMonth(prismaClient, userId);

  const existing = await findBudgetMonthByMonth(prismaClient, userId, activeMonth);
  if (existing) {
    return { status: "error", message: "Ce mois est déjà ouvert." };
  }

  const [previousMonthRow, previousMonthAllocations, fixedEntries, envelopes, provisions] =
    await Promise.all([
      findBudgetMonthByMonth(prismaClient, userId, previousMonth(activeMonth)),
      findLeftoverAllocationsByUserAndMonth(prismaClient, userId, previousMonth(activeMonth)),
      findFixedEntriesByUser(prismaClient, userId),
      findVariableEnvelopesByUser(prismaClient, userId),
      findProvisionsByUser(prismaClient, userId),
    ]);

  // R18/R21's starting point: each provision's real balance from every
  // contribution and provision-expense ever recorded against it, not just
  // this very first opening's (necessarily empty) history.
  const balances = await findProvisionBalancesByUser(prismaClient, userId);
  const provisionsWithBalance = provisions.map((provision) => ({
    ...provision,
    balance: balances.get(provision.id) ?? moneyFromCents(0),
  }));

  const result = openMonth({
    month: activeMonth,
    income,
    previousMonthStatus: previousMonthRow ? previousMonthRow.status : "none",
    carriedOver: computeCarriedOver(previousMonthAllocations),
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
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const result = await openMonthForUser(prisma, session.user.id, parsed.data.incomeEuros);
  if (result.status === "success") {
    // revalidatePath needs a Next.js request context, unlike openMonthForUser
    // above — kept here so the core stays testable (see its doc comment).
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}

function describePointFixedEntryFailure(_error: PointFixedEntryFailure): string {
  return "Ce poste fixe ne fait pas partie du budget de ce mois.";
}

/** Session-free core, same split as `openMonthForUser` above. */
export async function pointFixedEntryForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: { fixedEntryId: string; done: boolean },
): Promise<VariableEnvelopeActionState> {
  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, activeMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: MONTH_NOT_OPEN };
  }

  const result = pointFixedEntry(budgetMonth.fixedEntries, input.fixedEntryId, input.done);
  if (!result.ok) {
    return { status: "error", message: describePointFixedEntryFailure(result.error) };
  }

  await updateSnapshotFixedEntryStatus(
    prismaClient,
    userId,
    activeMonth,
    input.fixedEntryId,
    input.done ? "done" : "planned",
  );
  return { status: "success", message: input.done ? "Poste fixe pointé." : "Pointage annulé." };
}

export async function pointFixedEntryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = pointFixedEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const result = await pointFixedEntryForUser(prisma, session.user.id, parsed.data);
  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}

/**
 * R20: once the month is closed, a deadline provision whose due month is
 * this very month and whose balance (post-closing contributions included)
 * falls short of its target passes to "late".
 */
async function applyLateProvisionTransitions(
  prismaClient: PrismaClient,
  userId: string,
  closingMonth: Month,
): Promise<void> {
  const provisions = await findProvisionsByUser(prismaClient, userId);
  const dueThisMonth = provisions.filter(
    (provision) =>
      provision.type === "deadline" &&
      provision.status === "active" &&
      isSameMonth(dueMonth(provision), closingMonth),
  );

  if (dueThisMonth.length === 0) return;

  const balances = await findProvisionBalancesByUser(prismaClient, userId);
  for (const provision of dueThisMonth) {
    const balance = balances.get(provision.id) ?? moneyFromCents(0);
    if (becomesLateAtMonthClose(provision, closingMonth, balance)) {
      await markProvisionLate(prismaClient, userId, provision.id);
    }
  }
}

function describeCloseMonthFailure(error: CloseMonthFailure): string {
  switch (error.type) {
    case "invalidAllocationAmount":
      return "Saisis un montant supérieur à 0 pour chaque répartition.";
    case "provisionNotInSnapshot":
      return "Cette provision ne fait pas partie du budget de ce mois.";
    case "envelopeNotActiveNextMonth":
      return "Cette enveloppe ne sera pas active le mois prochain.";
    case "nextMonthAlreadyOpen":
      return "Le mois prochain est déjà ouvert : le report et les bonus d'enveloppe ne peuvent plus être modifiés.";
  }
}

export type CloseMonthAllocationInput = {
  destination: "savings" | "provision" | "envelope" | "report";
  provisionId: string;
  envelopeId: string;
  amountEuros: number;
};

/**
 * Session-free core, same split as `openMonthForUser` above. R25: a
 * provision split is dated the day of the closing itself — never a date the
 * client supplies, like `date` is never taken from client input for the
 * month being closed (see `resolveActiveMonth`'s own comment).
 */
export async function closeMonthForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: { allocations: CloseMonthAllocationInput[] },
): Promise<VariableEnvelopeActionState> {
  const closedAt = new Date();
  const date = parseCalendarDate(closedAt.toISOString().slice(0, 10));

  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, activeMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: MONTH_NOT_OPEN };
  }

  const [nextMonthRow, envelopes] = await Promise.all([
    findBudgetMonthByMonth(prismaClient, userId, nextMonth(activeMonth)),
    findVariableEnvelopesByUser(prismaClient, userId),
  ]);
  const nextMonthActiveEnvelopeIds = envelopes
    .filter((envelope) => activeVersionAt(envelope, nextMonth(activeMonth)))
    .map((envelope) => envelope.id);

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
      switch (allocation.destination) {
        case "savings":
          return [{ destination: "savings", amount }];
        case "provision":
          return [{ destination: "provision", provisionId: allocation.provisionId, amount }];
        case "envelope":
          return [{ destination: "envelope", envelopeId: allocation.envelopeId, amount }];
        case "report":
          return [{ destination: "report", amount }];
        default:
          return [];
      }
    },
  );

  const result = closeMonth({
    date,
    allocations,
    snapshotProvisionIds: budgetMonth.provisionTargets.map((entry) => entry.provisionId),
    nextMonthActiveEnvelopeIds,
    nextMonthIsOpen: nextMonthRow?.status === "open",
  });

  if (!result.ok) {
    return { status: "error", message: describeCloseMonthFailure(result.error) };
  }

  await closeBudgetMonth(prismaClient, userId, activeMonth, {
    closedAt,
    allocations: result.allocations,
    contributions: result.contributions,
  });
  await applyLateProvisionTransitions(prismaClient, userId, activeMonth);
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
      envelopeId: formData.getAll("allocationEnvelopeId")[index],
      amountEuros: formData.getAll("allocationAmountEuros")[index],
    })),
  });
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const result = await closeMonthForUser(prisma, session.user.id, parsed.data);
  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
    revalidatePath("/history");
  }
  return result;
}

function describeReopenMonthFailure(_error: ReopenMonthFailure): string {
  return "Ce mois n'est pas clôturé.";
}

/**
 * Session-free core, same split as `openMonthForUser` above. R29: only the
 * last closed month can be reopened, and only while no other month is
 * already open on top of it.
 */
export async function reopenMonthForUser(
  prismaClient: PrismaClient,
  userId: string,
): Promise<VariableEnvelopeActionState> {
  const openMonthRow = await findOpenBudgetMonthByUser(prismaClient, userId);
  const mostRecentlyClosed = await findMostRecentClosedBudgetMonthByUser(prismaClient, userId);

  const result = reopenMonth(openMonthRow ? "open" : (mostRecentlyClosed?.status ?? "open"));
  if (!result.ok || !mostRecentlyClosed) {
    return { status: "error", message: describeReopenMonthFailure({ type: "notClosed" }) };
  }

  await reopenBudgetMonth(prismaClient, userId, mostRecentlyClosed.month);
  return { status: "success", message: "Mois réouvert." };
}

export async function reopenMonthAction(
  _prevState: VariableEnvelopeActionState,
  _formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const result = await reopenMonthForUser(prisma, session.user.id);
  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
    revalidatePath("/history");
  }
  return result;
}
