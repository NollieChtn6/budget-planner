import { formatMonth } from "@budget/domain";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";

export default async function Home() {
  const session = await requireSession();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Bienvenue sur votre dashboard, {session.user.name}</h1>
      <Link href={`/months/${formatMonth(resolveCurrentMonth())}`} className="underline">
        Mois en cours
      </Link>
      <Link href="/settings/envelopes" className="underline">
        Enveloppes variables
      </Link>
      <Link href="/settings/fixed-entries" className="underline">
        Postes fixes
      </Link>
      <Link href="/settings/provisions" className="underline">
        Provisions
      </Link>
      <SignOutButton />
    </div>
  );
}
