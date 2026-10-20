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
  isSameMonth,
  moneyFromEuros,
  moneyToEuros,
  monthOfCalendarDate,
  parseCalendarDate,
  type RecordContributionFailure,
  recordContribution,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { INVALID_AMOUNT, INVALID_DATE, MONTH_NOT_OPEN, notFound } from "@/actions/messages";
import type { OperationActionState } from "@/actions/operation-state";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveActiveMonth } from "@/lib/current-month";
import { successWithDisposableIncomeWarning } from "@/lib/disposable-income";
import { formatEuros } from "@/lib/format-money";
import { requireSession } from "@/lib/session";
import {
  createContributionSchema,
  deleteContributionSchema,
  updateContributionSchema,
} from "@/schemas/contribution";
import { describeInvalidInput } from "@/schemas/describe-invalid-input";

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
): Promise<OperationActionState> {
  let amount: ReturnType<typeof moneyFromEuros>;
  try {
    amount = moneyFromEuros(input.amountEuros);
  } catch {
    return { status: "error", message: INVALID_AMOUNT };
  }

  let date: ReturnType<typeof parseCalendarDate>;
  try {
    date = parseCalendarDate(input.date);
  } catch {
    return { status: "error", message: INVALID_DATE };
  }

  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, activeMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: MONTH_NOT_OPEN };
  }

  const result = recordContribution(
    { date, amount, provisionId: input.provisionId },
    {
      currentMonth: activeMonth,
      snapshotProvisionIds: budgetMonth.provisionTargets.map((entry) => entry.provisionId),
    },
  );

  if (!result.ok) {
    return { status: "error", message: describeRecordContributionFailure(result.error) };
  }

  await createContribution(prismaClient, userId, result.contribution);
  return successWithDisposableIncomeWarning(
    prismaClient,
    userId,
    budgetMonth,
    `Versement de ${formatEuros(moneyToEuros(result.contribution.amount))} enregistré.`,
  );
}

export async function createContributionAction(
  _prevState: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  const session = await requireSession();
  const parsed = createContributionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const result = await createContributionForUser(prisma, session.user.id, parsed.data);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}

export type UpdateContributionInput = CreateContributionInput & { id: string };

/** Session-free core, same split as `createContributionForUser`. */
export async function updateContributionForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: UpdateContributionInput,
): Promise<OperationActionState> {
  let amount: ReturnType<typeof moneyFromEuros>;
  try {
    amount = moneyFromEuros(input.amountEuros);
  } catch {
    return { status: "error", message: INVALID_AMOUNT };
  }

  let date: ReturnType<typeof parseCalendarDate>;
  try {
    date = parseCalendarDate(input.date);
  } catch {
    return { status: "error", message: INVALID_DATE };
  }

  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, activeMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: MONTH_NOT_OPEN };
  }

  const existing = await findContributionById(prismaClient, userId, input.id);
  if (!existing || !isSameMonth(monthOfCalendarDate(existing.date), activeMonth)) {
    return { status: "error", message: notFound("Versement") };
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
      currentMonth: activeMonth,
      snapshotProvisionIds: budgetMonth.provisionTargets.map((entry) => entry.provisionId),
    },
  );

  if (!result.ok) {
    return { status: "error", message: describeRecordContributionFailure(result.error) };
  }

  // A legacy `manual` contribution keeps its origin: editing it mustn't start
  // deducting it from the disposable income retroactively (R37).
  await updateContribution(prismaClient, userId, input.id, {
    ...result.contribution,
    origin: existing.origin,
  });
  return successWithDisposableIncomeWarning(
    prismaClient,
    userId,
    budgetMonth,
    "Versement modifié.",
  );
}

export async function updateContributionAction(
  _prevState: OperationActionState,
  formData: FormData,
): Promise<OperationActionState> {
  const session = await requireSession();
  const parsed = updateContributionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const result = await updateContributionForUser(prisma, session.user.id, parsed.data);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}

/** Session-free core, same split as `createContributionForUser`. */
export async function deleteContributionForUser(
  prismaClient: PrismaClient,
  userId: string,
  contributionId: string,
): Promise<VariableEnvelopeActionState> {
  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, activeMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: MONTH_NOT_OPEN };
  }

  const existing = await findContributionById(prismaClient, userId, contributionId);
  if (!existing || !isSameMonth(monthOfCalendarDate(existing.date), activeMonth)) {
    return { status: "error", message: notFound("Versement") };
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
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const result = await deleteContributionForUser(prisma, session.user.id, parsed.data.id);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}
