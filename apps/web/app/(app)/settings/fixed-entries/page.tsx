import { findFixedEntriesByUser, prisma } from "@budget/db";
import {
  activeFixedEntryVersionAt,
  compareMonths,
  formatMonth,
  moneyToEuros,
} from "@budget/domain";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";
import { type FixedEntryRowData, FixedEntryTable } from "./fixed-entry-table";

export default async function FixedEntriesSettingsPage() {
  const session = await requireSession();
  const fixedEntries = await findFixedEntriesByUser(prisma, session.user.id);
  const currentMonth = resolveCurrentMonth();

  const rows: FixedEntryRowData[] = fixedEntries.map((entry) => {
    const displayed =
      activeFixedEntryVersionAt(entry, currentMonth) ??
      [...entry.versions].sort((a, b) => compareMonths(b.effectiveFrom, a.effectiveFrom))[0];

    return {
      id: entry.id,
      label: displayed?.label ?? "",
      type: entry.type,
      archivedFrom: entry.archivedFrom ? formatMonth(entry.archivedFrom) : null,
      amountEuros: displayed ? moneyToEuros(displayed.amount) : null,
    };
  });

  const monthlyTotal = rows.reduce(
    (sum, row) => sum + (row.archivedFrom ? 0 : (row.amountEuros ?? 0)),
    0,
  );

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-heading text-xl">Postes fixes</h2>
      <FixedEntryTable rows={rows} monthlyTotal={monthlyTotal} />
    </div>
  );
}
