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
  isSameMonth,
  type Money,
  type Month,
  moneyFromEuros,
  nextMonth,
  unarchiveFixedEntry,
} from "@budget/domain";
import { revalidatePath } from "next/cache";
import { INVALID_AMOUNT, INVALID_REQUEST, notFound } from "@/actions/messages";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveCurrentMonth } from "@/lib/current-month";
import { recalculateOpenMonthSnapshotForUser } from "@/lib/recalculate-open-month";
import { requireSession } from "@/lib/session";
import { describeInvalidInput } from "@/schemas/describe-invalid-input";
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
    return { message: INVALID_AMOUNT };
  }
}

function describeAddVersionFailure(): string {
  return "Date d'effet invalide : choisis le mois en cours ou le mois suivant.";
}

function describeArchiveFailure(_error: ArchiveFixedEntryFailure): string {
  return "Date d'archivage invalide : choisis le mois en cours (s'il n'a pas encore d'opération) ou le mois suivant.";
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
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const amount = toMoneyOrMessage(parsed.data.amountEuros);
  if ("message" in amount) {
    return { status: "error", message: amount.message };
  }

  const result = addFixedEntryVersion(
    "pending",
    { effectiveFrom, label: parsed.data.label, amount },
    currentMonth,
  );
  if (!result.ok) {
    return { status: "error", message: describeAddVersionFailure() };
  }

  await createFixedEntry(prisma, session.user.id, {
    type: parsed.data.type,
    firstVersion: result.version,
  });
  if (isSameMonth(effectiveFrom, currentMonth)) {
    await recalculateOpenMonthSnapshotForUser(prisma, session.user.id);
  }
  revalidatePath(FIXED_ENTRIES_PATH);
  revalidatePath("/");
  revalidatePath("/operations");
  return { status: "success", message: "Poste fixe créé." };
}

/**
 * R7: the single "Modifier" form covers both the label and the amount — a
 * rename and an amount change are the same kind of edit (the version
 * carries both), with the same current/next-month effective-date choice.
 */
export async function addFixedEntryVersionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = addFixedEntryVersionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const existing = await findFixedEntryById(prisma, session.user.id, parsed.data.fixedEntryId);
  if (!existing) {
    return { status: "error", message: notFound("Poste fixe") };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const amount = toMoneyOrMessage(parsed.data.amountEuros);
  if ("message" in amount) {
    return { status: "error", message: amount.message };
  }

  const result = addFixedEntryVersion(
    parsed.data.fixedEntryId,
    { effectiveFrom, label: parsed.data.label, amount },
    currentMonth,
  );
  if (!result.ok) {
    return { status: "error", message: describeAddVersionFailure() };
  }

  await persistFixedEntryVersion(prisma, session.user.id, parsed.data.fixedEntryId, result.version);
  if (isSameMonth(effectiveFrom, currentMonth)) {
    await recalculateOpenMonthSnapshotForUser(prisma, session.user.id);
  }
  revalidatePath(FIXED_ENTRIES_PATH);
  revalidatePath("/");
  revalidatePath("/operations");
  return { status: "success", message: "Poste fixe modifié." };
}

export async function archiveFixedEntryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = archiveFixedEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const fixedEntry = await findFixedEntryById(prisma, session.user.id, parsed.data.fixedEntryId);
  if (!fixedEntry) {
    return { status: "error", message: notFound("Poste fixe") };
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
  if (isSameMonth(effectiveFrom, currentMonth)) {
    await recalculateOpenMonthSnapshotForUser(prisma, session.user.id);
  }
  revalidatePath(FIXED_ENTRIES_PATH);
  revalidatePath("/");
  revalidatePath("/operations");
  return { status: "success", message: "Poste fixe archivé." };
}

export async function unarchiveFixedEntryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = unarchiveFixedEntrySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: INVALID_REQUEST };
  }

  const fixedEntry = await findFixedEntryById(prisma, session.user.id, parsed.data.fixedEntryId);
  if (!fixedEntry) {
    return { status: "error", message: notFound("Poste fixe") };
  }

  const result = unarchiveFixedEntry(fixedEntry, resolveCurrentMonth());
  if (!result.ok) {
    return { status: "error", message: describeUnarchiveFailure() };
  }

  await setFixedEntryArchivedFrom(prisma, session.user.id, parsed.data.fixedEntryId, null);
  revalidatePath(FIXED_ENTRIES_PATH);
  return { status: "success", message: "Poste fixe désarchivé." };
}
