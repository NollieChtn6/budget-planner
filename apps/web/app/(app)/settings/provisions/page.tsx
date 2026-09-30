import { findProvisionsByUser, prisma } from "@budget/db";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/session";
import { CreateProvisionForm } from "./create-provision-form";
import { ProvisionCard } from "./provision-card";

export default async function ProvisionsSettingsPage() {
  const session = await requireSession();
  const provisions = await findProvisionsByUser(prisma, session.user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Provisions</h1>
      <CreateProvisionForm />
      <Separator />
      <div className="flex flex-col gap-4">
        {provisions.map((provision) => (
          <ProvisionCard key={provision.id} provision={provision} />
        ))}
      </div>
    </div>
  );
}
