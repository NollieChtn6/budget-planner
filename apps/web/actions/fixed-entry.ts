"use server";

import {
  createFixedEntry,
  findFixedEntryById,
  persistFixedEntryVersion,
  prisma,
  setFixedEntryArchivedFrom,
} from "@budget/db";
import {
  type ArchiveFixedEntryFailure,
  addFixedEntryVersion,
  archiveFixedEntry,
  type Money,
  type Month,
  moneyFromEuros,
  nextMonth,
  unarchiveFixedEntry,
} from "@budget/domain";
import { revalidatePath } from "next/cache";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import {
  addFixedEntryVersionSchema,
  archiveFixedEntrySchema,
  createFixedEntrySchema,
  unarchiveFixedEntrySchema,
} from "@/schemas/fixed-entry";

const FIXED_ENTRIES_PATH = "/settings/fixed-entries";

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

function describeAddVersionFailure(): string {
  return "Date d'effet invalide : choisissez le mois en cours ou le mois suivant.";
}

function describeArchiveFailure(_error: ArchiveFixedEntryFailure): string {
  return "Date d'archivage invalide : choisissez le mois en cours (sans opération) ou le mois suivant.";
}

function describeUnarchiveFailure(): string {
  return "Ce poste fixe ne peut plus être désarchivé (la date d'effet est déjà passée).";
}

export async function createFixedEntryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = createFixedEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const amount = toMoneyOrMessage(parsed.data.amountEuros);
  if ("message" in amount) {
    return { status: "error", message: amount.message };
  }

  const result = addFixedEntryVersion("pending", { effectiveFrom, amount }, currentMonth);
  if (!result.ok) {
    return { status: "error", message: describeAddVersionFailure() };
  }

  await createFixedEntry(prisma, session.user.id, {
    label: parsed.data.label,
    type: parsed.data.type,
    firstVersion: result.version,
  });
  revalidatePath(FIXED_ENTRIES_PATH);
  return { status: "success", message: "Poste fixe créé." };
}

export async function addFixedEntryVersionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = addFixedEntryVersionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const existing = await findFixedEntryById(prisma, session.user.id, parsed.data.fixedEntryId);
  if (!existing) {
    return { status: "error", message: "Poste fixe introuvable." };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const amount = toMoneyOrMessage(parsed.data.amountEuros);
  if ("message" in amount) {
    return { status: "error", message: amount.message };
  }

  const result = addFixedEntryVersion(
    parsed.data.fixedEntryId,
    { effectiveFrom, amount },
    currentMonth,
  );
  if (!result.ok) {
    return { status: "error", message: describeAddVersionFailure() };
  }

  await persistFixedEntryVersion(prisma, session.user.id, parsed.data.fixedEntryId, result.version);
  revalidatePath(FIXED_ENTRIES_PATH);
  return { status: "success", message: "Version ajoutée." };
}

export async function archiveFixedEntryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = archiveFixedEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const fixedEntry = await findFixedEntryById(prisma, session.user.id, parsed.data.fixedEntryId);
  if (!fixedEntry) {
    return { status: "error", message: "Poste fixe introuvable." };
  }

  const result = archiveFixedEntry(
    fixedEntry,
    { effectiveFrom, hasOperationsInCurrentMonth: false },
    currentMonth,
  );
  if (!result.ok) {
    return { status: "error", message: describeArchiveFailure(result.error) };
  }

  await setFixedEntryArchivedFrom(prisma, session.user.id, parsed.data.fixedEntryId, effectiveFrom);
  revalidatePath(FIXED_ENTRIES_PATH);
  return { status: "success", message: "Poste fixe archivé." };
}

export async function unarchiveFixedEntryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = unarchiveFixedEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Entrée invalide." };
  }

  const fixedEntry = await findFixedEntryById(prisma, session.user.id, parsed.data.fixedEntryId);
  if (!fixedEntry) {
    return { status: "error", message: "Poste fixe introuvable." };
  }

  const result = unarchiveFixedEntry(fixedEntry, resolveCurrentMonth());
  if (!result.ok) {
    return { status: "error", message: describeUnarchiveFailure() };
  }

  await setFixedEntryArchivedFrom(prisma, session.user.id, parsed.data.fixedEntryId, null);
  revalidatePath(FIXED_ENTRIES_PATH);
  return { status: "success", message: "Poste fixe désarchivé." };
}
