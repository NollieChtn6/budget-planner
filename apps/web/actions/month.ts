"use server";

import {
  createBudgetMonth,
  findBudgetMonthByMonth,
  findFixedEntriesByUser,
  findProvisionsByUser,
  findVariableEnvelopesByUser,
  prisma,
} from "@budget/db";
import {
  formatMonth,
  moneyFromCents,
  moneyFromEuros,
  openMonth,
  previousMonth,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import { openMonthSchema } from "@/schemas/month";

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

  const result = openMonth({
    month: currentMonth,
    income,
    previousMonthStatus: previousMonthRow ? previousMonthRow.status : "none",
    fixedEntries,
    envelopes,
    // Contribution/Expense don't exist yet, so no provision can have a
    // balance before this very first opening (see issue #11).
    provisions: provisions.map((provision) => ({ ...provision, balance: moneyFromCents(0) })),
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
