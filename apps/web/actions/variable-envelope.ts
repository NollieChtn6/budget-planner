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
  type Money,
  type Month,
  moneyFromEuros,
  nextMonth,
  parseMonth,
  unarchive,
  type VariableEnvelope,
} from "@budget/domain";
import { revalidatePath } from "next/cache";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { requireSession } from "@/lib/session";
import {
  addVariableEnvelopeVersionSchema,
  archiveVariableEnvelopeSchema,
  createVariableEnvelopeSchema,
  unarchiveVariableEnvelopeSchema,
} from "@/schemas/variable-envelope";

const ENVELOPES_PATH = "/settings/envelopes";

function resolveCurrentMonth(): Month {
  return parseMonth(new Date().toISOString().slice(0, 7));
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

function describeAddVersionFailure(error: AddVersionFailure): string {
  if (error.type === "invalidEffectiveDate") {
    return "Date d'effet invalide : choisissez le mois en cours ou le mois suivant.";
  }
  const details = error.violations.map((v) => `${formatMonth(v.month)} : ${v.total}%`).join(", ");
  return `La somme des pourcentages dépasserait 100 % : ${details}.`;
}

function describeArchiveFailure(_error: ArchiveFailure): string {
  return "Date d'archivage invalide : choisissez le mois en cours (sans opération) ou le mois suivant.";
}

function describeUnarchiveFailure(): string {
  return "Cette enveloppe ne peut plus être désarchivée (la date d'effet est déjà passée).";
}

function buildAddVersionInput(
  data:
    | { mode: "amount"; amountEuros: number; effectiveFrom: Month }
    | { mode: "percentage"; percentage: number; effectiveFrom: Month },
): AddVersionInput | { message: string } {
  if (data.mode === "amount") {
    const value = toMoneyOrMessage(data.amountEuros);
    if (!("cents" in value)) {
      return value;
    }
    return { mode: "amount", effectiveFrom: data.effectiveFrom, value };
  }
  return { mode: "percentage", effectiveFrom: data.effectiveFrom, value: data.percentage };
}

export async function createVariableEnvelopeAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = createVariableEnvelopeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const input = buildAddVersionInput({ ...parsed.data, effectiveFrom });
  if ("message" in input) {
    return { status: "error", message: input.message };
  }

  const existingEnvelopes = await findVariableEnvelopesByUser(prisma, session.user.id);
  const placeholderId = randomUUID();
  const placeholder: VariableEnvelope = {
    id: placeholderId,
    label: parsed.data.label,
    versions: [],
  };
  const result = addVersion(
    placeholderId,
    [...existingEnvelopes, placeholder],
    input,
    currentMonth,
  );
  if (!result.ok) {
    return { status: "error", message: describeAddVersionFailure(result.error) };
  }

  await createVariableEnvelope(prisma, session.user.id, {
    label: parsed.data.label,
    firstVersion: result.version,
  });
  revalidatePath(ENVELOPES_PATH);
  return { status: "success", message: "Enveloppe créée." };
}

export async function addVariableEnvelopeVersionAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = addVariableEnvelopeVersionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const input = buildAddVersionInput({ ...parsed.data, effectiveFrom });
  if ("message" in input) {
    return { status: "error", message: input.message };
  }

  const envelopes = await findVariableEnvelopesByUser(prisma, session.user.id);
  const result = addVersion(parsed.data.envelopeId, envelopes, input, currentMonth);
  if (!result.ok) {
    return { status: "error", message: describeAddVersionFailure(result.error) };
  }

  await addVariableEnvelopeVersion(prisma, session.user.id, parsed.data.envelopeId, result.version);
  revalidatePath(ENVELOPES_PATH);
  return { status: "success", message: "Version ajoutée." };
}

export async function archiveVariableEnvelopeAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = archiveVariableEnvelopeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const currentMonth = resolveCurrentMonth();
  const effectiveFrom = resolveEffectiveFrom(parsed.data.effectiveFrom, currentMonth);
  const envelope = await findVariableEnvelopeById(prisma, session.user.id, parsed.data.envelopeId);
  if (!envelope) {
    return { status: "error", message: "Enveloppe introuvable." };
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
  revalidatePath(ENVELOPES_PATH);
  return { status: "success", message: "Enveloppe archivée." };
}

export async function unarchiveVariableEnvelopeAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = unarchiveVariableEnvelopeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Entrée invalide." };
  }

  const envelope = await findVariableEnvelopeById(prisma, session.user.id, parsed.data.envelopeId);
  if (!envelope) {
    return { status: "error", message: "Enveloppe introuvable." };
  }

  const result = unarchive(envelope, resolveCurrentMonth());
  if (!result.ok) {
    return { status: "error", message: describeUnarchiveFailure() };
  }

  await setVariableEnvelopeArchivedFrom(prisma, session.user.id, parsed.data.envelopeId, null);
  revalidatePath(ENVELOPES_PATH);
  return { status: "success", message: "Enveloppe désarchivée." };
}
