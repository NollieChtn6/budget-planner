"use server";

import {
  createExtraIncome,
  deleteExtraIncome,
  findBudgetMonthByMonth,
  findExtraIncomeById,
  prisma,
  updateExtraIncome,
} from "@budget/db";
import {
  isSameMonth,
  monthOfCalendarDate,
  type RecordExtraIncomeFailure,
  recordExtraIncome,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { OperationActionState } from "@/actions/operation-state";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveActiveMonth } from "@/lib/current-month";
import { parseAmountAndDate } from "@/lib/parse-operation-input";
import { requireSession } from "@/lib/session";
import {
  createExtraIncomeSchema,
  deleteExtraIncomeSchema,
  updateExtraIncomeSchema,
} from "@/schemas/extra-income";

function describeRecordExtraIncomeFailure(error: RecordExtraIncomeFailure): string {
  switch (error.type) {
    case "invalidAmount":
      return "Saisis un montant supérieur à 0.";
    case "emptyLabel":
      return "Saisis un libellé.";
    case "dateOutsideCurrentMonth":
      return "Choisis une date dans le mois en cours.";
  }
}

export type CreateExtraIncomeInput = {
  amountEuros: number;
  date: string;
  label: string;
};

/**
 * Shared by create and update: parses, checks the month is open and applies
 * the domain rule (R36). Session-free like the `…ForUser` functions below, so
 * it can be tested against a real test database.
 */
async function validateExtraIncome(
  prismaClient: PrismaClient,
  userId: string,
  input: CreateExtraIncomeInput,
) {
  const parsed = parseAmountAndDate(input.amountEuros, input.date);
  if (!parsed.ok) {
    return { status: "error", message: parsed.message } as const;
  }

  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, activeMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: "Le mois n'est pas ouvert." } as const;
  }

  const result = recordExtraIncome(
    { date: parsed.date, amount: parsed.amount, label: input.label },
    { currentMonth: activeMonth },
  );
  if (!result.ok) {
    return { status: "error", message: describeRecordExtraIncomeFailure(result.error) } as const;
  }

  return { status: "ok", extraIncome: result.extraIncome, activeMonth } as const;
}

export async function createExtraIncomeForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: CreateExtraIncomeInput,
): Promise<VariableEnvelopeActionState> {
  const validated = await validateExtraIncome(prismaClient, userId, input);
  if (validated.status === "error") {
    return validated;
  }

  await createExtraIncome(prismaClient, userId, validated.extraIncome);
  return { status: "success", message: "Entrée exceptionnelle enregistrée." };
}

export async function createExtraIncomeAction(
  _prevState: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  const session = await requireSession();
  const parsed = createExtraIncomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await createExtraIncomeForUser(prisma, session.user.id, parsed.data);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}

export type UpdateExtraIncomeInput = CreateExtraIncomeInput & { id: string };

export async function updateExtraIncomeForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: UpdateExtraIncomeInput,
): Promise<VariableEnvelopeActionState> {
  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const existing = await findExtraIncomeById(prismaClient, userId, input.id);
  if (!existing || !isSameMonth(monthOfCalendarDate(existing.date), activeMonth)) {
    return { status: "error", message: "Entrée exceptionnelle introuvable." };
  }

  const validated = await validateExtraIncome(prismaClient, userId, input);
  if (validated.status === "error") {
    return validated;
  }

  await updateExtraIncome(prismaClient, userId, input.id, validated.extraIncome);
  return { status: "success", message: "Entrée exceptionnelle modifiée." };
}

export async function updateExtraIncomeAction(
  _prevState: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  const session = await requireSession();
  const parsed = updateExtraIncomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await updateExtraIncomeForUser(prisma, session.user.id, parsed.data);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}

export async function deleteExtraIncomeForUser(
  prismaClient: PrismaClient,
  userId: string,
  extraIncomeId: string,
): Promise<VariableEnvelopeActionState> {
  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, activeMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: "Le mois n'est pas ouvert." };
  }

  const existing = await findExtraIncomeById(prismaClient, userId, extraIncomeId);
  if (!existing || !isSameMonth(monthOfCalendarDate(existing.date), activeMonth)) {
    return { status: "error", message: "Entrée exceptionnelle introuvable." };
  }

  await deleteExtraIncome(prismaClient, userId, extraIncomeId);
  return { status: "success", message: "Entrée exceptionnelle supprimée." };
}

export async function deleteExtraIncomeAction(
  _prevState: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  const session = await requireSession();
  const parsed = deleteExtraIncomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await deleteExtraIncomeForUser(prisma, session.user.id, parsed.data.id);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}
