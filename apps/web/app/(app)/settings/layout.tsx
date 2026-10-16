import { SettingsSubnav } from "./settings-subnav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-[34px] leading-tight">Paramètres</h1>
        <p className="mt-1.5 text-muted-foreground">
          Postes fixes, enveloppes, provisions et catégories. Tout peut être ajouté, modifié ou
          supprimé à tout moment.
        </p>
      </div>
      <SettingsSubnav />
      {children}
    </div>
  );
}
