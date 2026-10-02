import type { Category } from "@budget/domain";
import type { PrismaClient } from "@prisma/client";
import { toDomainCategory } from "../mappers/category";

export async function findCategoriesByUser(
  prisma: PrismaClient,
  userId: string,
): Promise<Category[]> {
  const rows = await prisma.category.findMany({ where: { userId } });
  return rows.map(toDomainCategory);
}

export async function findCategoryById(
  prisma: PrismaClient,
  userId: string,
  categoryId: string,
): Promise<Category | null> {
  const row = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  return row ? toDomainCategory(row) : null;
}

export async function createCategory(
  prisma: PrismaClient,
  userId: string,
  input: { label: string; defaultEnvelopeId?: string },
): Promise<Category> {
  const row = await prisma.category.create({
    data: { userId, label: input.label, defaultEnvelopeId: input.defaultEnvelopeId ?? null },
  });
  return toDomainCategory(row);
}

export async function setCategoryArchived(
  prisma: PrismaClient,
  userId: string,
  categoryId: string,
  archived: boolean,
): Promise<Category> {
  const updated = await prisma.category.updateMany({
    where: { id: categoryId, userId },
    data: { archived },
  });
  if (updated.count === 0) {
    throw new Error(`Category ${categoryId} not found for this user`);
  }

  const result = await findCategoryById(prisma, userId, categoryId);
  if (!result) {
    throw new Error(`Category ${categoryId} not found for this user`);
  }
  return result;
}
