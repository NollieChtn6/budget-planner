"use server";

import {
  createReimbursement,
  deleteReimbursement,
  findBudgetMonthByMonth,
  findCategoriesByUser,
  findExpenseById,
  findReimbursementById,
  findReimbursementsByUserAndExpense,
  prisma,
  updateReimbursement,
} from "@budget/db";
import {
  exceedsExpenseAmount,
  isSameMonth,
  type Money,
  moneyFromEuros,
  moneyToEuros,
  monthOfCalendarDate,
  parseCalendarDate,
  type RecordReimbursementFailure,
  type Reimbursement,
  recordReimbursement,
} from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { INVALID_AMOUNT, INVALID_DATE, MONTH_NOT_OPEN, notFound } from "@/actions/messages";
import type { ReimbursementActionState } from "@/actions/reimbursement-state";
import { resolveActiveMonth } from "@/lib/current-month";
import { formatEuros } from "@/lib/format-money";
import { requireSession } from "@/lib/session";
import { describeInvalidInput } from "@/schemas/describe-invalid-input";
import {
  createReimbursementSchema,
  deleteReimbursementSchema,
  updateReimbursementSchema,
} from "@/schemas/reimbursement";

function describeRecordReimbursementFailure(error: RecordReimbursementFailure): string {
  switch (error.type) {
    case "invalidAmount":
      return "Saisis un montant supérieur à 0.";
    case "emptyLabel":
      return "Saisis un libellé.";
    case "dateOutsideCurrentMonth":
      return "Choisis une date dans le mois en cours.";
    case "unknownCategory":
      return notFound("Catégorie");
    case "archivedCategory":
      return "Cette catégorie est archivée.";
  }
}

const OVER_REIMBURSED_WARNING =
  "Attention : les remboursements liés à cette dépense dépassent son montant.";

export type CreateReimbursementInput = {
  amountEuros: number;
  date: string;
  label: string;
  categoryId: string;
  expenseId?: string;
};

/**
 * Shared by create and update: parses, checks the month is open, applies the
 * domain rule (R35) and verifies the linked expense belongs to the user.
 * `excludedReimbursementId` is the reimbursement being edited, so it isn't
 * counted twice in the R35 over-reimbursement warning.
 */
async function validateReimbursement(
  prismaClient: PrismaClient,
  userId: string,
  input: CreateReimbursementInput,
  excludedReimbursementId?: string,
): Promise<
  | { status: "error"; message: string }
  | { status: "ok"; reimbursement: Omit<Reimbursement, "id">; overReimbursed: boolean }
> {
  let amount: Money;
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

  const categories = await findCategoriesByUser(prismaClient, userId);
  const result = recordReimbursement(
    {
      date,
      amount,
      label: input.label,
      categoryId: input.categoryId,
      expenseId: input.expenseId,
    },
    { currentMonth: activeMonth, categories },
  );
  if (!result.ok) {
    return { status: "error", message: describeRecordReimbursementFailure(result.error) };
  }

  let overReimbursed = false;
  if (input.expenseId) {
    const expense = await findExpenseById(prismaClient, userId, input.expenseId);
    if (!expense) {
      return { status: "error", message: notFound("Dépense d'origine") };
    }
    const linked = await findReimbursementsByUserAndExpense(prismaClient, userId, expense.id);
    overReimbursed = exceedsExpenseAmount(expense.amount, [
      ...linked.filter((r) => r.id !== excludedReimbursementId).map((r) => r.amount),
      amount,
    ]);
  }

  return { status: "ok", reimbursement: result.reimbursement, overReimbursed };
}

function success(message: string, overReimbursed: boolean): ReimbursementActionState {
  return {
    status: "success",
    message,
    ...(overReimbursed ? { warning: OVER_REIMBURSED_WARNING } : {}),
  };
}

/**
 * Session-free core, same split as `createContributionForUser`: it can be
 * unit-tested against a real test database without a Next.js request context.
 */
export async function createReimbursementForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: CreateReimbursementInput,
): Promise<ReimbursementActionState> {
  const validated = await validateReimbursement(prismaClient, userId, input);
  if (validated.status === "error") {
    return validated;
  }

  await createReimbursement(prismaClient, userId, validated.reimbursement);
  return success(
    `Remboursement de ${formatEuros(moneyToEuros(validated.reimbursement.amount))} enregistré.`,
    validated.overReimbursed,
  );
}

export async function createReimbursementAction(
  _prevState: ReimbursementActionState,
  formData: FormData,
): Promise<ReimbursementActionState> {
  const session = await requireSession();
  const parsed = createReimbursementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const result = await createReimbursementForUser(prisma, session.user.id, parsed.data);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}

export type UpdateReimbursementInput = CreateReimbursementInput & { id: string };

/** Session-free core, same split as `createReimbursementForUser`. */
export async function updateReimbursementForUser(
  prismaClient: PrismaClient,
  userId: string,
  input: UpdateReimbursementInput,
): Promise<ReimbursementActionState> {
  const existing = await findReimbursementById(prismaClient, userId, input.id);
  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  if (!existing || !isSameMonth(monthOfCalendarDate(existing.date), activeMonth)) {
    return { status: "error", message: notFound("Remboursement") };
  }

  const validated = await validateReimbursement(prismaClient, userId, input, input.id);
  if (validated.status === "error") {
    return validated;
  }

  await updateReimbursement(prismaClient, userId, input.id, validated.reimbursement);
  return success("Remboursement modifié.", validated.overReimbursed);
}

export async function updateReimbursementAction(
  _prevState: ReimbursementActionState,
  formData: FormData,
): Promise<ReimbursementActionState> {
  const session = await requireSession();
  const parsed = updateReimbursementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const result = await updateReimbursementForUser(prisma, session.user.id, parsed.data);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}

/** Session-free core, same split as `createReimbursementForUser`. */
export async function deleteReimbursementForUser(
  prismaClient: PrismaClient,
  userId: string,
  reimbursementId: string,
): Promise<ReimbursementActionState> {
  const activeMonth = await resolveActiveMonth(prismaClient, userId);
  const budgetMonth = await findBudgetMonthByMonth(prismaClient, userId, activeMonth);
  if (budgetMonth?.status !== "open") {
    return { status: "error", message: MONTH_NOT_OPEN };
  }

  const existing = await findReimbursementById(prismaClient, userId, reimbursementId);
  if (!existing || !isSameMonth(monthOfCalendarDate(existing.date), activeMonth)) {
    return { status: "error", message: notFound("Remboursement") };
  }

  await deleteReimbursement(prismaClient, userId, reimbursementId);
  return { status: "success", message: "Remboursement supprimé." };
}

export async function deleteReimbursementAction(
  _prevState: ReimbursementActionState,
  formData: FormData,
): Promise<ReimbursementActionState> {
  const session = await requireSession();
  const parsed = deleteReimbursementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const result = await deleteReimbursementForUser(prisma, session.user.id, parsed.data.id);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/operations");
  }
  return result;
}
