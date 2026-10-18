import { findProvisionsByUser, prisma } from "@budget/db";
import { dueMonth, formatMonth, moneyToEuros } from "@budget/domain";
import { requireSession } from "@/lib/session";
import { type ProvisionRowData, ProvisionTable } from "./provision-table";

export default async function ProvisionsSettingsPage() {
  const session = await requireSession();
  const provisions = await findProvisionsByUser(prisma, session.user.id);

  const rows: ProvisionRowData[] = provisions.map((provision) => ({
    id: provision.id,
    label: provision.label,
    type: provision.type,
    status: provision.status,
    archivedFrom: provision.archivedFrom ? formatMonth(provision.archivedFrom) : null,
    targetEuros: moneyToEuros(provision.target),
    durationMonths: provision.type === "deadline" ? provision.durationMonths : null,
    dueMonthLabel: provision.type === "deadline" ? formatMonth(dueMonth(provision)) : null,
    monthlyAmountEuros: provision.type === "reserve" ? moneyToEuros(provision.monthlyAmount) : null,
  }));

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-heading text-xl">Provisions</h2>
      <ProvisionTable rows={rows} />
    </div>
  );
}
