"use server";

import {
  createCategory,
  findCategoryById,
  findVariableEnvelopesByUser,
  prisma,
  setCategoryArchived,
} from "@budget/db";
import { archiveCategory, unarchiveCategory } from "@budget/domain";
import { revalidatePath } from "next/cache";
import type { VariableEnvelopeActionState } from "@/actions/variable-envelope-state";
import { isEnvelopeActive } from "@/lib/active-envelopes";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import {
  archiveCategorySchema,
  createCategorySchema,
  NO_DEFAULT_ENVELOPE,
  unarchiveCategorySchema,
} from "@/schemas/category";

const CATEGORIES_PATH = "/settings/categories";

export async function createCategoryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = createCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Entrée invalide." };
  }

  const defaultEnvelopeId =
    parsed.data.defaultEnvelopeId === NO_DEFAULT_ENVELOPE
      ? undefined
      : parsed.data.defaultEnvelopeId;

  if (defaultEnvelopeId) {
    const currentMonth = resolveCurrentMonth();
    const envelopes = await findVariableEnvelopesByUser(prisma, session.user.id);
    const envelope = envelopes.find((e) => e.id === defaultEnvelopeId);
    if (!envelope || !isEnvelopeActive(envelope, currentMonth)) {
      return { status: "error", message: "Enveloppe par défaut introuvable." };
    }
  }

  await createCategory(prisma, session.user.id, { label: parsed.data.label, defaultEnvelopeId });
  revalidatePath(CATEGORIES_PATH);
  return { status: "success", message: "Catégorie créée." };
}

export async function archiveCategoryAction(
  _prevState: VariableEnvelopeActionState,
  formData: FormData,
): Promise<VariableEnvelopeActionState> {
  const session = await requireSession();
  const parsed = archiveCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Entrée invalide." };
  }

  const category = await findCategoryById(prisma, session.user.id, parsed.data.categoryId);
  if (!category) {
    return { status: "error", message: "Catégorie introuvable." };
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
    return { status: "error", message: "Entrée invalide." };
  }

  const category = await findCategoryById(prisma, session.user.id, parsed.data.categoryId);
  if (!category) {
    return { status: "error", message: "Catégorie introuvable." };
  }
  if (!category.archived) {
    return { status: "error", message: "Cette catégorie n'est pas archivée." };
  }

  const unarchived = unarchiveCategory(category);
  await setCategoryArchived(prisma, session.user.id, parsed.data.categoryId, unarchived.archived);
  revalidatePath(CATEGORIES_PATH);
  return { status: "success", message: "Catégorie désarchivée." };
}
