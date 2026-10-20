"use server";

import { randomUUID } from "node:crypto";
import {
  addVariableEnvelopeVersion,
  createVariableEnvelope,
  findVariableEnvelopeById,
  findVariableEnvelopesByUser,
  prisma,
  setVariableEnvelopeArchivedFrom,
} from "@budget/db";
import {
  type AddVersionFailure,
  type AddVersionInput,
  type ArchiveFailure,
  addVersion,
  archive,
  formatMonth,
  isSameMonth,
  type Money,
  type Month,
  moneyFromEuros,
  nextMonth,
  unarchive,
  type VariableEnvelope,
} from "@budget/domain";
import { revalidatePath } from "next/cache";
import { INVALID_AMOUNT, INVALID_REQUEST, notFound } from "@/actions/messages";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { resolveCurrentMonth } from "@/lib/current-month";
import { recalculateOpenMonthSnapshotForUser } from "@/lib/recalculate-open-month";
import { requireSession } from "@/lib/session";
import { describeInvalidInput } from "@/schemas/describe-invalid-input";
import {
  addVariableEnvelopeVersionSchema,
  archiveVariableEnvelopeSchema,
  createVariableEnvelopeSchema,
  unarchiveVariableEnvelopeSchema,
} from "@/schemas/variable-envelope";

const ENVELOPES_PATH = "/settings/envelopes";

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

function describeAddVersionFailure(error: AddVersionFailure): string {
  if (error.type === "invalidEffectiveDate") {
    return "Date d'effet invalide : choisis le mois en cours ou le mois suivant.";
  }
  const details = error.violations.map((v) => `${formatMonth(v.month)} : ${v.total}%`).join(", ");
  return `La somme des pourcentages dépasserait 100 % : ${details}.`;
}

function describeArchiveFailure(_error: ArchiveFailure): string {
  return "Date d'archivage invalide : choisis le mois en cours (s'il n'a pas encore d'opération) ou le mois suivant.";
}

function describeUnarchiveFailure(): string {
  return "Cette enveloppe ne peut plus être désarchivée (la date d'effet est déjà passée).";
}

function buildAddVersionInput(
  data:
    | { mode: "amount"; label: string; amountEuros: number; effectiveFrom: Month }
    | { mode: "percentage"; label: string; percentage: number; effectiveFrom: Month },
): AddVersionInput | { message: string } {
  if (data.mode === "amount") {
    const value = toMoneyOrMessage(data.amountEuros);
    if (!("cents" in value)) {
      return value;
    }
    return { mode: "amount", effectiveFrom: data.effectiveFrom, label: data.label, value };
  }
  return {
    mode: "percentage",
    effectiveFrom: data.effectiveFrom,
    label: data.label,
    value: data.percentage,
  };
}

export async function createVariableEnvelopeAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = createVariableEnvelopeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const input = buildAddVersionInput({ ...parsed.data, effectiveFrom });
  if ("message" in input) {
    return { status: "error", message: input.message };
  }

  const existingEnvelopes = await findVariableEnvelopesByUser(prisma, session.user.id);
  const placeholderId = randomUUID();
  const placeholder: VariableEnvelope = { id: placeholderId, versions: [] };
  const result = addVersion(
    placeholderId,
    [...existingEnvelopes, placeholder],
    input,
    currentMonth,
  );
  if (!result.ok) {
    return { status: "error", message: describeAddVersionFailure(result.error) };
  }

  await createVariableEnvelope(prisma, session.user.id, { firstVersion: result.version });
  if (isSameMonth(effectiveFrom, currentMonth)) {
    await recalculateOpenMonthSnapshotForUser(prisma, session.user.id);
  }
  revalidatePath(ENVELOPES_PATH);
  revalidatePath("/");
  revalidatePath("/operations");
  return { status: "success", message: "Enveloppe créée." };
}

/**
 * R7: the single "Modifier" form covers both the label and the mode/value —
 * a rename and a value change are the same kind of edit (the version
 * carries both), with the same current/next-month effective-date choice.
 */
export async function addVariableEnvelopeVersionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = addVariableEnvelopeVersionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const input = buildAddVersionInput({ ...parsed.data, effectiveFrom });
  if ("message" in input) {
    return { status: "error", message: input.message };
  }

  const envelopes = await findVariableEnvelopesByUser(prisma, session.user.id);
  if (!envelopes.some((envelope) => envelope.id === parsed.data.envelopeId)) {
    return { status: "error", message: notFound("Enveloppe") };
  }

  const result = addVersion(parsed.data.envelopeId, envelopes, input, currentMonth);
  if (!result.ok) {
    return { status: "error", message: describeAddVersionFailure(result.error) };
  }

  await addVariableEnvelopeVersion(prisma, session.user.id, parsed.data.envelopeId, result.version);
  if (isSameMonth(effectiveFrom, currentMonth)) {
    await recalculateOpenMonthSnapshotForUser(prisma, session.user.id);
  }
  revalidatePath(ENVELOPES_PATH);
  revalidatePath("/");
  revalidatePath("/operations");
  return { status: "success", message: "Enveloppe modifiée." };
}

export async function archiveVariableEnvelopeAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = archiveVariableEnvelopeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const envelope = await findVariableEnvelopeById(prisma, session.user.id, parsed.data.envelopeId);
  if (!envelope) {
    return { status: "error", message: notFound("Enveloppe") };
  }

  const result = archive(
    envelope,
    { effectiveFrom, hasOperationsInCurrentMonth: false },
    currentMonth,
  );
  if (!result.ok) {
    return { status: "error", message: describeArchiveFailure(result.error) };
  }

  await setVariableEnvelopeArchivedFrom(
    prisma,
    session.user.id,
    parsed.data.envelopeId,
    effectiveFrom,
  );
  if (isSameMonth(effectiveFrom, currentMonth)) {
    await recalculateOpenMonthSnapshotForUser(prisma, session.user.id);
  }
  revalidatePath(ENVELOPES_PATH);
  revalidatePath("/");
  revalidatePath("/operations");
  return { status: "success", message: "Enveloppe archivée." };
}

export async function unarchiveVariableEnvelopeAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = unarchiveVariableEnvelopeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: INVALID_REQUEST };
  }

  const envelope = await findVariableEnvelopeById(prisma, session.user.id, parsed.data.envelopeId);
  if (!envelope) {
    return { status: "error", message: notFound("Enveloppe") };
  }

  const result = unarchive(envelope, resolveCurrentMonth());
  if (!result.ok) {
    return { status: "error", message: describeUnarchiveFailure() };
  }

  await setVariableEnvelopeArchivedFrom(prisma, session.user.id, parsed.data.envelopeId, null);
  revalidatePath(ENVELOPES_PATH);
  return { status: "success", message: "Enveloppe désarchivée." };
}
