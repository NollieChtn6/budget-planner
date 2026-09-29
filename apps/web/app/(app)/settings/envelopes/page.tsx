import { findVariableEnvelopesByUser, prisma } from "@budget/db";
import { Separator } from "@/components/ui/separator";
import { requireSession } from "@/lib/session";
import { CreateEnvelopeForm } from "./create-envelope-form";
import { EnvelopeCard } from "./envelope-card";

export default async function EnvelopesSettingsPage() {
  const session = await requireSession();
  const envelopes = await findVariableEnvelopesByUser(prisma, session.user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Enveloppes variables</h1>
      <CreateEnvelopeForm />
      <Separator />
      <div className="flex flex-col gap-4">
        {envelopes.map((envelope) => (
          <EnvelopeCard key={envelope.id} envelope={envelope} />
        ))}
      </div>
    </div>
  );
}
