import { findCategoriesByUser, findVariableEnvelopesByUser, prisma } from "@budget/db";
import { Separator } from "@/components/ui/separator";
import { filterActiveEnvelopes } from "@/lib/active-envelopes";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import { CategoryCard } from "./category-card";
import { CreateCategoryForm } from "./create-category-form";

export default async function CategoriesSettingsPage() {
  const session = await requireSession();
  const [categories, envelopes] = await Promise.all([
    findCategoriesByUser(prisma, session.user.id),
    findVariableEnvelopesByUser(prisma, session.user.id),
  ]);
  const activeEnvelopes = filterActiveEnvelopes(envelopes, resolveCurrentMonth());

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Catégories</h1>
      <CreateCategoryForm envelopes={activeEnvelopes} />
      <Separator />
      <div className="flex flex-col gap-4">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} envelopes={envelopes} />
        ))}
      </div>
    </div>
  );
}
