"use server";

import {
  createCategory,
  findCategoryById,
  findVariableEnvelopesByUser,
  persistCategoryUpdate,
  prisma,
  setCategoryArchived,
} from "@budget/db";
import { archiveCategory, unarchiveCategory, updateCategory } from "@budget/domain";
import { revalidatePath } from "next/cache";
import { INVALID_REQUEST, notFound } from "@/actions/messages";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { isEnvelopeActive } from "@/lib/active-envelopes";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import {
  archiveCategorySchema,
  createCategorySchema,
  NO_DEFAULT_ENVELOPE,
  unarchiveCategorySchema,
  updateCategorySchema,
} from "@/schemas/category";
import { describeInvalidInput } from "@/schemas/describe-invalid-input";

const CATEGORIES_PATH = "/settings/categories";

/** Resolves the Select's "none" sentinel and checks the envelope exists and is active this month. */
async function resolveDefaultEnvelopeId(
  userId: string,
  rawDefaultEnvelopeId: string,
): Promise<{ defaultEnvelopeId: string | undefined } | { message: string }> {
  if (rawDefaultEnvelopeId === NO_DEFAULT_ENVELOPE) {
    return { defaultEnvelopeId: undefined };
  }
  const currentMonth = resolveCurrentMonth();
  const envelopes = await findVariableEnvelopesByUser(prisma, userId);
  const envelope = envelopes.find((e) => e.id === rawDefaultEnvelopeId);
  if (!envelope || !isEnvelopeActive(envelope, currentMonth)) {
    return { message: notFound("Enveloppe par défaut") };
  }
  return { defaultEnvelopeId: rawDefaultEnvelopeId };
}

export async function createCategoryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = createCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const resolved = await resolveDefaultEnvelopeId(session.user.id, parsed.data.defaultEnvelopeId);
  if ("message" in resolved) {
    return { status: "error", message: resolved.message };
  }

  await createCategory(prisma, session.user.id, {
    label: parsed.data.label,
    color: parsed.data.color,
    defaultEnvelopeId: resolved.defaultEnvelopeId,
  });
  revalidatePath(CATEGORIES_PATH);
  return { status: "success", message: "Catégorie créée." };
}

export async function updateCategoryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = updateCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: describeInvalidInput(parsed.error) };
  }

  const category = await findCategoryById(prisma, session.user.id, parsed.data.categoryId);
  if (!category) {
    return { status: "error", message: notFound("Catégorie") };
  }

  const resolved = await resolveDefaultEnvelopeId(session.user.id, parsed.data.defaultEnvelopeId);
  if ("message" in resolved) {
    return { status: "error", message: resolved.message };
  }

  const updated = updateCategory(category, {
    label: parsed.data.label,
    color: parsed.data.color,
    defaultEnvelopeId: resolved.defaultEnvelopeId,
  });
  await persistCategoryUpdate(prisma, session.user.id, parsed.data.categoryId, {
    label: updated.label,
    color: updated.color,
    defaultEnvelopeId: updated.defaultEnvelopeId,
  });
  revalidatePath(CATEGORIES_PATH);
  return { status: "success", message: "Catégorie modifiée." };
}

export async function archiveCategoryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = archiveCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: INVALID_REQUEST };
  }

  const category = await findCategoryById(prisma, session.user.id, parsed.data.categoryId);
  if (!category) {
    return { status: "error", message: notFound("Catégorie") };
  }
  if (category.archived) {
    return { status: "error", message: "Cette catégorie est déjà archivée." };
  }

  const archived = archiveCategory(category);
  await setCategoryArchived(prisma, session.user.id, parsed.data.categoryId, archived.archived);
  revalidatePath(CATEGORIES_PATH);
  return { status: "success", message: "Catégorie archivée." };
}

export async function unarchiveCategoryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = unarchiveCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: INVALID_REQUEST };
  }

  const category = await findCategoryById(prisma, session.user.id, parsed.data.categoryId);
  if (!category) {
    return { status: "error", message: notFound("Catégorie") };
  }
  if (!category.archived) {
    return { status: "error", message: "Cette catégorie n'est pas archivée." };
  }

  const unarchived = unarchiveCategory(category);
  await setCategoryArchived(prisma, session.user.id, parsed.data.categoryId, unarchived.archived);
  revalidatePath(CATEGORIES_PATH);
  return { status: "success", message: "Catégorie désarchivée." };
}
