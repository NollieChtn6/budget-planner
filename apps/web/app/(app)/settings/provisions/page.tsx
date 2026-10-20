import { findProvisionsByUser, prisma } from "@budget/db";
import { dueMonth, formatMonth, moneyToEuros } from "@budget/domain";
import { resolveActiveMonth } from "@/lib/current-month";
import { formatFromMonthLabel, formatMonthLabel } from "@/lib/format-month-label";
import { requireSession } from "@/lib/session";
import { type ProvisionRowData, ProvisionTable } from "./provision-table";

export default async function ProvisionsSettingsPage() {
  const session = await requireSession();
  const provisions = await findProvisionsByUser(prisma, session.user.id);
  const activeMonth = formatMonth(await resolveActiveMonth(prisma, session.user.id));

  const rows: ProvisionRowData[] = provisions.map((provision) => ({
    id: provision.id,
    label: provision.label,
    type: provision.type,
    status: provision.status,
    archivedFromLabel: provision.archivedFrom ? formatFromMonthLabel(provision.archivedFrom) : null,
    targetEuros: moneyToEuros(provision.target),
    durationMonths: provision.type === "deadline" ? provision.durationMonths : null,
    dueMonthLabel:
      provision.type === "deadline" ? formatMonthLabel(dueMonth(provision)).toLowerCase() : null,
    monthlyAmountEuros: provision.type === "reserve" ? moneyToEuros(provision.monthlyAmount) : null,
  }));

  return (
    <div className="flex flex-col gap-2">
      <h2 className="sr-only">Provisions</h2>
      <ProvisionTable rows={rows} activeMonth={activeMonth} />
    </div>
  );
}
