import { findFixedEntriesByUser, prisma } from "@budget/db";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/session";
import { CreateFixedEntryForm } from "./create-fixed-entry-form";
import { FixedEntryCard } from "./fixed-entry-card";

export default async function FixedEntriesSettingsPage() {
  const session = await requireSession();
  const fixedEntries = await findFixedEntriesByUser(prisma, session.user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Postes fixes</h1>
      <CreateFixedEntryForm />
      <Separator />
      <div className="flex flex-col gap-4">
        {fixedEntries.map((fixedEntry) => (
          <FixedEntryCard key={fixedEntry.id} fixedEntry={fixedEntry} />
        ))}
      </div>
    </div>
  );
}
