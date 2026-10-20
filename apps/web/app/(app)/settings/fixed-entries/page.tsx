import { findFixedEntriesByUser, prisma } from "@budget/db";
import {
  activeFixedEntryVersionAt,
  compareMonths,
  isMonthAfter,
  moneyToEuros,
} from "@budget/domain";
import { resolveCurrentMonth } from "@/lib/current-month";
import { formatEuros } from "@/lib/format-money";
import { formatFromMonthLabel } from "@/lib/format-month-label";
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
    const upcoming = entry.versions
      .filter((version) => isMonthAfter(version.effectiveFrom, currentMonth))
      .sort((a, b) => compareMonths(a.effectiveFrom, b.effectiveFrom))[0];

    return {
      id: entry.id,
      label: displayed?.label ?? "",
      type: entry.type,
      archivedFromLabel: entry.archivedFrom ? formatFromMonthLabel(entry.archivedFrom) : null,
      amountEuros: displayed ? moneyToEuros(displayed.amount) : null,
      upcoming: upcoming
        ? {
            valueLabel: formatEuros(moneyToEuros(upcoming.amount)),
            fromLabel: formatFromMonthLabel(upcoming.effectiveFrom),
          }
        : null,
    };
  });

  const monthlyTotal = rows.reduce(
    (sum, row) => sum + (row.archivedFromLabel ? 0 : (row.amountEuros ?? 0)),
    0,
  );

  return (
    <div className="flex flex-col gap-2">
      <h2 className="sr-only">Postes fixes</h2>
      <FixedEntryTable rows={rows} monthlyTotal={monthlyTotal} />
    </div>
  );
}
