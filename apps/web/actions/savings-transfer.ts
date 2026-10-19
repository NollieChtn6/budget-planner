"use server";

import {
  createSavingsTransfer,
  deleteSavingsTransfer,
  findBudgetMonthByMonth,
  findSavingsTransferById,
  prisma,
  updateSavingsTransfer,
} from "@budget/db";
import {
  isSameMonth,
  monthOfCalendarDate,
  type RecordSavingsTransferFailure,
  recordSavingsTransfer,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { OperationActionState } from "@/actions/operation-state";
import { resolveActiveMonth } from "@/lib/current-month";
import { successWithDisposableIncomeWarning } from "@/lib/disposable-income";
import { parseAmountAndDate } from "@/lib/parse-operation-input";
import { requireSession } from "@/lib/session";
import {
  createSavingsTransferSchema,
  deleteSavingsTransferSchema,
  updateSavingsTransferSchema,
} from "@/schemas/savings-transfer";

function describeRecordSavingsTransferFailure(error: RecordSavingsTransferFailure): string {
  switch (error.type) {
    case "invalidAmount":
      return "Saisis un montant supérieur à 0.";
    case "dateOutsideCurrentMonth":
      return "Choisis une date dans le mois en cours.";
  }
}

export type CreateSavingsTransferInput = {
  amountEuros: number;
  date: string;
  label?: string;
};

/** Shared by create and update; session-free like the `…ForUser` functions below. */
async function validateSavingsTransfer(
  prismaClient: PrismaClient,
  userId: string,
  input: CreateSavingsTransferInput,
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

  const result = recordSavingsTransfer(
    { date: parsed.date, amount: parsed.amount, label: input.label },
    { currentMonth: activeMonth },
  );
  if (!result.ok) {
    return {
      status: "error",
      message: describeRecordSavingsTransferFailure(result.error),
    } as const;
  }

  return { status: "ok", savingsTransfer: result.savingsTransfer, budgetMonth } as const;
}

export async function createSavingsTransferForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: CreateSavingsTransferInput,
): Promise<OperationActionState> {
  const validated = await validateSavingsTransfer(prismaClient, userId, input);
  if (validated.status === "error") {
    return validated;
  }

  await createSavingsTransfer(prismaClient, userId, validated.savingsTransfer);
  return successWithDisposableIncomeWarning(
    prismaClient,
    userId,
    validated.budgetMonth,
    "Transfert enregistré.",
  );
}

export async function createSavingsTransferAction(
  _prevState: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  const session = await requireSession();
  const parsed = createSavingsTransferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await createSavingsTransferForUser(prisma, session.user.id, parsed.data);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}

export type UpdateSavingsTransferInput = CreateSavingsTransferInput & { id: string };

export async function updateSavingsTransferForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: UpdateSavingsTransferInput,
): Promise<OperationActionState> {
  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const existing = await findSavingsTransferById(prismaClient, userId, input.id);
  if (!existing || !isSameMonth(monthOfCalendarDate(existing.date), activeMonth)) {
    return { status: "error", message: "Transfert introuvable." };
  }

  const validated = await validateSavingsTransfer(prismaClient, userId, input);
  if (validated.status === "error") {
    return validated;
  }

  await updateSavingsTransfer(prismaClient, userId, input.id, validated.savingsTransfer);
  return successWithDisposableIncomeWarning(
    prismaClient,
    userId,
    validated.budgetMonth,
    "Transfert modifié.",
  );
}

export async function updateSavingsTransferAction(
  _prevState: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  const session = await requireSession();
  const parsed = updateSavingsTransferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await updateSavingsTransferForUser(prisma, session.user.id, parsed.data);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}

export async function deleteSavingsTransferForUser(
  prismaClient: PrismaClient,
  userId: string,
  savingsTransferId: string,
): Promise<OperationActionState> {
  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, activeMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: "Le mois n'est pas ouvert." };
  }

  const existing = await findSavingsTransferById(prismaClient, userId, savingsTransferId);
  if (!existing || !isSameMonth(monthOfCalendarDate(existing.date), activeMonth)) {
    return { status: "error", message: "Transfert introuvable." };
  }

  await deleteSavingsTransfer(prismaClient, userId, savingsTransferId);
  return { status: "success", message: "Transfert supprimé." };
}

export async function deleteSavingsTransferAction(
  _prevState: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  const session = await requireSession();
  const parsed = deleteSavingsTransferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const result = await deleteSavingsTransferForUser(prisma, session.user.id, parsed.data.id);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}
