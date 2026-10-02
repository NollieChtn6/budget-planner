import type { Category } from "@budget/domain";
import type { Category as PrismaCategory } from "@prisma/client";

export function toDomainCategory(row: PrismaCategory): Category {
  return {
    id: row.id,
    label: row.label,
    archived: row.archived,
    ...(row.defaultEnvelopeId ? { defaultEnvelopeId: row.defaultEnvelopeId } : {}),
  };
}
