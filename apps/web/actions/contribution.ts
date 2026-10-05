"use server";

import { createContribution, findBudgetMonthByMonth, prisma } from "@budget/db";
import {
  formatMonth,
  moneyFromEuros,
  parseCalendarDate,
  type RecordContributionFailure,
  recordContribution,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import { createContributionSchema } from "@/schemas/contribution";

function describeRecordContributionFailure(error: RecordContributionFailure): string {
  switch (error.type) {
    case "invalidAmount":
      return "Saisis un montant supérieur à 0.";
    case "dateOutsideCurrentMonth":
      return "Choisis une date dans le mois en cours.";
    case "provisionNotInSnapshot":
      return "Cette provision ne fait pas partie du budget de ce mois.";
  }
}

export type CreateContributionInput = {
  amountEuros: number;
  date: string;
  provisionId: string;
};

/**
 * Session-free core, same split as `openMonthForUser` (actions/month.ts): it
 * can be unit-tested against a real test database without a Next.js request
 * context.
 */
export async function createContributionForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: CreateContributionInput,
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

  const currentMonth = resolveCurrentMonth();
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, currentMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: "Le mois n'est pas ouvert." };
  }

  const result = recordContribution(
    { date, amount, provisionId: input.provisionId },
    {
      currentMonth,
      snapshotProvisionIds: budgetMonth.provisionTargets.map((entry) => entry.provisionId),
    },
  );

  if (!result.ok) {
    return { status: "error", message: describeRecordContributionFailure(result.error) };
  }

  await createContribution(prismaClient, userId, result.contribution);
  return { status: "success", message: "Versement enregistré." };
}

export async function createContributionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = createContributionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await createContributionForUser(prisma, session.user.id, parsed.data);

  if (result.status === "success") {
    revalidatePath(`/months/${formatMonth(resolveCurrentMonth())}`);
  }
  return result;
}
