import { nextMonth } from "@budget/domain";
import { resolveCurrentMonth } from "@/lib/current-month";
import { formatMonthLabel } from "@/lib/format-month-label";
import { MonthChoicesProvider } from "./settings-form-parts";
import { SettingsSubnav } from "./settings-subnav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const currentMonth = resolveCurrentMonth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-[34px] leading-tight">Paramètres</h1>
        <p className="mt-1.5 max-w-prose text-muted-foreground">
          Une modification s'applique à partir du mois que tu choisis : les mois passés ne changent
          pas. Ce qui ne sert plus s'archive, rien n'est supprimé.
        </p>
      </div>
      <SettingsSubnav />
      <MonthChoicesProvider
        current={formatMonthLabel(currentMonth)}
        next={formatMonthLabel(nextMonth(currentMonth))}
      >
        {children}
      </MonthChoicesProvider>
    </div>
  );
}
