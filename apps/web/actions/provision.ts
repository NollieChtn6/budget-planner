"use server";

import {
  closeProvision as closeProvisionRow,
  createProvision,
  extendProvisionDeadline,
  findProvisionById,
  prisma,
  renewProvision as renewProvisionRow,
  setProvisionArchivedFrom,
  updateProvisionGoal,
} from "@budget/db";
import {
  type ArchiveProvisionFailure,
  archiveProvision,
  closeProvision,
  type ExtendProvisionFailure,
  extendProvision,
  formatMonth,
  isSameMonth,
  type Money,
  type Month,
  moneyFromEuros,
  nextMonth,
  parseMonth,
  renewProvision,
  unarchiveProvision,
} from "@budget/domain";
import { revalidatePath } from "next/cache";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveCurrentMonth } from "@/lib/current-month";
import { recalculateOpenMonthSnapshotForUser } from "@/lib/recalculate-open-month";
import { requireSession } from "@/lib/session";
import {
  archiveProvisionSchema,
  closeProvisionSchema,
  createProvisionSchema,
  extendProvisionSchema,
  renewProvisionSchema,
  unarchiveProvisionSchema,
  updateProvisionGoalSchema,
} from "@/schemas/provision";

const PROVISIONS_PATH = "/settings/provisions";

function monthPath(): string {
  return `/months/${formatMonth(resolveCurrentMonth())}`;
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

function describeExtendFailure(error: ExtendProvisionFailure): string {
  switch (error.type) {
    case "notDeadlineProvision":
      return "Seule une provision à échéance peut être prolongée.";
    case "notLate":
      return "Cette provision n'est pas en retard.";
    case "newDueMonthNotAfterCurrent":
      return "La nouvelle échéance doit être postérieure à l'échéance actuelle.";
  }
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

  // A new provision active this month (e.g. a deadline starting now) needs
  // its target added to the already-open month's snapshot right away — see
  // recalculateOpenMonthSnapshot's doc comment. A no-op otherwise (not yet
  // active, or no month open).
  await recalculateOpenMonthSnapshotForUser(prisma, session.user.id);
  revalidatePath(PROVISIONS_PATH);
  revalidatePath("/");
  revalidatePath("/operations");
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
  if (isSameMonth(effectiveFrom, currentMonth)) {
    await recalculateOpenMonthSnapshotForUser(prisma, session.user.id);
  }
  revalidatePath(PROVISIONS_PATH);
  revalidatePath("/");
  revalidatePath("/operations");
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

export async function closeProvisionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = closeProvisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Entrée invalide." };
  }

  const provision = await findProvisionById(prisma, session.user.id, parsed.data.provisionId);
  if (!provision) {
    return { status: "error", message: "Provision introuvable." };
  }

  const result = closeProvision(provision);
  if (!result.ok) {
    return { status: "error", message: "Seule une provision à échéance peut être clôturée." };
  }

  await closeProvisionRow(prisma, session.user.id, parsed.data.provisionId);
  revalidatePath(monthPath());
  revalidatePath(PROVISIONS_PATH);
  return { status: "success", message: "Provision clôturée." };
}

export async function renewProvisionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = renewProvisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Entrée invalide." };
  }

  const provision = await findProvisionById(prisma, session.user.id, parsed.data.provisionId);
  if (!provision) {
    return { status: "error", message: "Provision introuvable." };
  }

  const result = renewProvision(provision, resolveCurrentMonth());
  if (!result.ok) {
    return { status: "error", message: "Seule une provision à échéance peut être renouvelée." };
  }

  await renewProvisionRow(prisma, session.user.id, parsed.data.provisionId, result.newProvision);
  revalidatePath(monthPath());
  revalidatePath(PROVISIONS_PATH);
  return { status: "success", message: "Provision renouvelée pour le mois prochain." };
}

export async function extendProvisionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = extendProvisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const provision = await findProvisionById(prisma, session.user.id, parsed.data.provisionId);
  if (!provision) {
    return { status: "error", message: "Provision introuvable." };
  }

  const result = extendProvision(provision, parseMonth(parsed.data.newDueMonth));
  if (!result.ok) {
    return { status: "error", message: describeExtendFailure(result.error) };
  }

  await extendProvisionDeadline(
    prisma,
    session.user.id,
    parsed.data.provisionId,
    result.provision.durationMonths,
  );
  revalidatePath(monthPath());
  revalidatePath(PROVISIONS_PATH);
  return { status: "success", message: "Échéance prolongée." };
}
