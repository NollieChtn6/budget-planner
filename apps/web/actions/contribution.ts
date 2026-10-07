"use server";

import {
  createContribution,
  deleteContribution,
  findBudgetMonthByMonth,
  findContributionById,
  prisma,
  updateContribution,
} from "@budget/db";
import {
  canModifyContribution,
  formatMonth,
  isSameMonth,
  moneyFromEuros,
  monthOfCalendarDate,
  parseCalendarDate,
  type RecordContributionFailure,
  recordContribution,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import {
  createContributionSchema,
  deleteContributionSchema,
  updateContributionSchema,
} from "@/schemas/contribution";

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

export type UpdateContributionInput = CreateContributionInput & { id: string };

/** Session-free core, same split as `createContributionForUser`. */
export async function updateContributionForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: UpdateContributionInput,
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

  const existing = await findContributionById(prismaClient, userId, input.id);
  if (!existing || !isSameMonth(monthOfCalendarDate(existing.date), currentMonth)) {
    return { status: "error", message: "Versement introuvable." };
  }
  if (!canModifyContribution(existing)) {
    return {
      status: "error",
      message: "Ce versement a été créé par une clôture de mois et ne peut pas être modifié.",
    };
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

  await updateContribution(prismaClient, userId, input.id, result.contribution);
  return { status: "success", message: "Versement modifié." };
}

export async function updateContributionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = updateContributionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await updateContributionForUser(prisma, session.user.id, parsed.data);

  if (result.status === "success") {
    revalidatePath(`/months/${formatMonth(resolveCurrentMonth())}`);
  }
  return result;
}

/** Session-free core, same split as `createContributionForUser`. */
export async function deleteContributionForUser(
  prismaClient: PrismaClient,
  userId: string,
  contributionId: string,
): Promise<VariableEnvelopeActionState> {
  const currentMonth = resolveCurrentMonth();
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, currentMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: "Le mois n'est pas ouvert." };
  }

  const existing = await findContributionById(prismaClient, userId, contributionId);
  if (!existing || !isSameMonth(monthOfCalendarDate(existing.date), currentMonth)) {
    return { status: "error", message: "Versement introuvable." };
  }
  if (!canModifyContribution(existing)) {
    return {
      status: "error",
      message: "Ce versement a été créé par une clôture de mois et ne peut pas être supprimé.",
    };
  }

  await deleteContribution(prismaClient, userId, contributionId);
  return { status: "success", message: "Versement supprimé." };
}

export async function deleteContributionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = deleteContributionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await deleteContributionForUser(prisma, session.user.id, parsed.data.id);

  if (result.status === "success") {
    revalidatePath(`/months/${formatMonth(resolveCurrentMonth())}`);
  }
  return result;
}
