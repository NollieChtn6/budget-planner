import { findCategoriesByUser, findVariableEnvelopesByUser, prisma } from "@budget/db";
import { filterActiveEnvelopes } from "@/lib/active-envelopes";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import { type CategoryRowData, CategoryTable } from "./category-table";

export default async function CategoriesSettingsPage() {
  const session = await requireSession();
  const [categories, envelopes] = await Promise.all([
    findCategoriesByUser(prisma, session.user.id),
    findVariableEnvelopesByUser(prisma, session.user.id),
  ]);
  const activeEnvelopes = filterActiveEnvelopes(envelopes, resolveCurrentMonth());

  const rows: CategoryRowData[] = categories.map((category) => ({
    id: category.id,
    label: category.label,
    color: category.color,
    archived: category.archived,
    defaultEnvelopeId: category.defaultEnvelopeId ?? null,
    defaultEnvelopeLabel:
      envelopes.find((envelope) => envelope.id === category.defaultEnvelopeId)?.label ?? null,
  }));

  const envelopeOptions = activeEnvelopes.map((envelope) => ({
    id: envelope.id,
    label: envelope.label,
  }));

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-heading text-xl">Catégories</h2>
      <CategoryTable rows={rows} envelopeOptions={envelopeOptions} />
    </div>
  );
}
