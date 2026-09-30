"use server";

import {
  createProvision,
  findProvisionById,
  prisma,
  setProvisionArchivedFrom,
  updateProvisionGoal,
} from "@budget/db";
import {
  type ArchiveProvisionFailure,
  archiveProvision,
  type Money,
  type Month,
  moneyFromEuros,
  nextMonth,
  parseMonth,
  unarchiveProvision,
} from "@budget/domain";
import { revalidatePath } from "next/cache";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { requireSession } from "@/lib/session";
import {
  archiveProvisionSchema,
  createProvisionSchema,
  unarchiveProvisionSchema,
  updateProvisionGoalSchema,
} from "@/schemas/provision";

const PROVISIONS_PATH = "/settings/provisions";

function resolveCurrentMonth(): Month {
  const now = new Date();
  const year = now.getFullYear().toString().padStart(4, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return parseMonth(`${year}-${month}`);
}

function resolveEffectiveFrom(choice: "current" | "next", currentMonth: Month): Month {
  return choice === "current" ? currentMonth : nextMonth(currentMonth);
}

function toMoneyOrMessage(euros: number): Money | { message: string } {
  try {
    return moneyFromEuros(euros);
  } catch {
    return { message: "Montant invalide (centimes uniquement)." };
  }
}

function describeArchiveFailure(_error: ArchiveProvisionFailure): string {
  return "Date d'archivage invalide : choisissez le mois en cours (sans opération) ou le mois suivant.";
}

function describeUnarchiveFailure(): string {
  return "Cette provision ne peut plus être désarchivée (la date d'effet est déjà passée).";
}

export async function createProvisionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = createProvisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const target = toMoneyOrMessage(parsed.data.targetEuros);
  if ("message" in target) {
    return { status: "error", message: target.message };
  }

  if (parsed.data.type === "deadline") {
    await createProvision(prisma, session.user.id, {
      type: "deadline",
      label: parsed.data.label,
      target,
      startMonth: parseMonth(parsed.data.startMonth),
      durationMonths: parsed.data.durationMonths,
    });
  } else {
    const monthlyAmount = toMoneyOrMessage(parsed.data.monthlyAmountEuros);
    if ("message" in monthlyAmount) {
      return { status: "error", message: monthlyAmount.message };
    }
    await createProvision(prisma, session.user.id, {
      type: "reserve",
      label: parsed.data.label,
      target,
      monthlyAmount,
    });
  }

  revalidatePath(PROVISIONS_PATH);
  return { status: "success", message: "Provision créée." };
}

export async function updateProvisionGoalAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = updateProvisionGoalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const existing = await findProvisionById(prisma, session.user.id, parsed.data.provisionId);
  if (!existing) {
    return { status: "error", message: "Provision introuvable." };
  }
  if (existing.type !== parsed.data.type) {
    return { status: "error", message: "Le type d'une provision ne peut pas être modifié." };
  }

  const target = toMoneyOrMessage(parsed.data.targetEuros);
  if ("message" in target) {
    return { status: "error", message: target.message };
  }

  if (parsed.data.type === "deadline") {
    await updateProvisionGoal(prisma, session.user.id, parsed.data.provisionId, {
      type: "deadline",
      target,
      durationMonths: parsed.data.durationMonths,
    });
  } else {
    const monthlyAmount = toMoneyOrMessage(parsed.data.monthlyAmountEuros);
    if ("message" in monthlyAmount) {
      return { status: "error", message: monthlyAmount.message };
    }
    await updateProvisionGoal(prisma, session.user.id, parsed.data.provisionId, {
      type: "reserve",
      target,
      monthlyAmount,
    });
  }

  revalidatePath(PROVISIONS_PATH);
  return { status: "success", message: "Objectif mis à jour." };
}

export async function archiveProvisionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = archiveProvisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const provision = await findProvisionById(prisma, session.user.id, parsed.data.provisionId);
  if (!provision) {
    return { status: "error", message: "Provision introuvable." };
  }

  const result = archiveProvision(
    provision,
    { effectiveFrom, hasOperationsInCurrentMonth: false },
    currentMonth,
  );
  if (!result.ok) {
    return { status: "error", message: describeArchiveFailure(result.error) };
  }

  await setProvisionArchivedFrom(prisma, session.user.id, parsed.data.provisionId, effectiveFrom);
  revalidatePath(PROVISIONS_PATH);
  return { status: "success", message: "Provision archivée." };
}

export async function unarchiveProvisionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = unarchiveProvisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Entrée invalide." };
  }

  const provision = await findProvisionById(prisma, session.user.id, parsed.data.provisionId);
  if (!provision) {
    return { status: "error", message: "Provision introuvable." };
  }

  const result = unarchiveProvision(provision, resolveCurrentMonth());
  if (!result.ok) {
    return { status: "error", message: describeUnarchiveFailure() };
  }

  await setProvisionArchivedFrom(prisma, session.user.id, parsed.data.provisionId, null);
  revalidatePath(PROVISIONS_PATH);
  return { status: "success", message: "Provision désarchivée." };
}
