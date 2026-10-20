import { requireSession } from "@/lib/session";
import { NameSection } from "./name-section";
import { PasswordSection } from "./password-section";

export default async function ProfilePage() {
  const { user } = await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-[34px] leading-tight">Profil</h1>
        <p className="mt-1.5 max-w-prose text-muted-foreground">
          Ton adresse email ({user.email}) est ton identifiant de connexion : elle ne se modifie pas
          depuis l'application.
        </p>
      </div>
      <NameSection name={user.name} />
      <PasswordSection />
    </div>
  );
}
