"use server";

import {
  createExpense,
  findBudgetMonthByMonth,
  findCategoriesByUser,
  findContributionsByUserAndProvision,
  findExpensesByUserAndProvision,
  prisma,
} from "@budget/db";
import {
  computeProvisionBalance,
  type ExpenseSource,
  formatMonth,
  moneyFromEuros,
  parseCalendarDate,
  type RecordExpenseFailure,
  recordExpense,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import { createExpenseSchema } from "@/schemas/expense";

function describeRecordExpenseFailure(error: RecordExpenseFailure): string {
  switch (error.type) {
    case "invalidAmount":
      return "Saisis un montant supérieur à 0.";
    case "dateOutsideCurrentMonth":
      return "Choisis une date dans le mois en cours.";
    case "unknownCategory":
      return "Catégorie introuvable.";
    case "archivedCategory":
      return "Cette catégorie est archivée.";
    case "envelopeNotInSnapshot":
      return "Cette enveloppe ne fait pas partie du budget de ce mois.";
    case "provisionNotInSnapshot":
      return "Cette provision ne fait pas partie du budget de ce mois.";
  }
}

/** Parses the "Imputer à" select's "envelope:<id>" / "provision:<id>" value. */
function parseTarget(value: string): ExpenseSource | null {
  const [type, id] = value.split(":", 2);
  if (type === "envelope" && id) return { type: "envelope", envelopeId: id };
  if (type === "provision" && id) return { type: "provision", provisionId: id };
  return null;
}

export type CreateExpenseInput = {
  amountEuros: number;
  date: string;
  categoryId: string;
  target: string;
  place?: string;
  description?: string;
};

/**
 * Session-free core, same split as `openMonthForUser` (actions/month.ts): it
 * can be unit-tested against a real test database without a Next.js request
 * context.
 */
export async function createExpenseForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: CreateExpenseInput,
): Promise<VariableEnvelopeActionState> {
  let amount: ReturnType<typeof moneyFromEuros>;
  try {
    amount = moneyFromEuros(input.amountEuros);
  } catch {
    return { status: "error", message: "Montant invalide (centimes uniquement)." };
  }

  let date: ReturnType<typeof parseCalendarDate>;
  try {
    date = parseCalendarDate(input.date);
  } catch {
    return { status: "error", message: "Date invalide." };
  }

  const target = parseTarget(input.target);
  if (!target) {
    return { status: "error", message: "Choisis une enveloppe ou une provision." };
  }

  const currentMonth = resolveCurrentMonth();
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, currentMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: "Le mois n'est pas ouvert." };
  }

  const categories = await findCategoriesByUser(prismaClient, userId);

  let provisionBalance: ReturnType<typeof moneyFromEuros> | undefined;
  if (target.type === "provision") {
    const [contributions, provisionExpenses] = await Promise.all([
      findContributionsByUserAndProvision(prismaClient, userId, target.provisionId),
      findExpensesByUserAndProvision(prismaClient, userId, target.provisionId),
    ]);
    provisionBalance = computeProvisionBalance(
      contributions.map((c) => c.amount),
      provisionExpenses,
    );
  }

  const result = recordExpense(
    {
      date,
      amount,
      place: input.place,
      description: input.description,
      categoryId: input.categoryId,
      target,
    },
    {
      currentMonth,
      categories,
      snapshotEnvelopeIds: budgetMonth.envelopeBudgets.map((entry) => entry.envelopeId),
      snapshotProvisionIds: budgetMonth.provisionTargets.map((entry) => entry.provisionId),
      provisionBalance,
    },
  );

  if (!result.ok) {
    return { status: "error", message: describeRecordExpenseFailure(result.error) };
  }

  await createExpense(prismaClient, userId, result.expense);
  return { status: "success", message: "Dépense enregistrée." };
}

export async function createExpenseAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = createExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await createExpenseForUser(prisma, session.user.id, {
    amountEuros: parsed.data.amountEuros,
    date: parsed.data.date,
    categoryId: parsed.data.categoryId,
    target: parsed.data.target,
    place: parsed.data.place || undefined,
    description: parsed.data.description || undefined,
  });

  if (result.status === "success") {
    revalidatePath(`/months/${formatMonth(resolveCurrentMonth())}`);
  }
  return result;
}
