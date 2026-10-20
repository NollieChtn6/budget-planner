import { findVariableEnvelopesByUser, prisma } from "@budget/db";
import {
  activeVersionAt,
  compareMonths,
  isMonthAfter,
  moneyToEuros,
  type VariableEnvelopeVersion,
} from "@budget/domain";
import { resolveCurrentMonth } from "@/lib/current-month";
import { formatEuros } from "@/lib/format-money";
import { formatFromMonthLabel } from "@/lib/format-month-label";
import { requireSession } from "@/lib/session";
import { type EnvelopeRowData, EnvelopeTable } from "./envelope-table";

function valueLabelOf(version: VariableEnvelopeVersion): string {
  return version.mode === "amount"
    ? formatEuros(moneyToEuros(version.value))
    : `${version.value} %`;
}

export default async function EnvelopesSettingsPage() {
  const session = await requireSession();
  const envelopes = await findVariableEnvelopesByUser(prisma, session.user.id);
  const currentMonth = resolveCurrentMonth();

  const rows: EnvelopeRowData[] = envelopes.map((envelope) => {
    const displayed =
      activeVersionAt(envelope, currentMonth) ??
      [...envelope.versions].sort((a, b) => compareMonths(b.effectiveFrom, a.effectiveFrom))[0];
    const upcoming = envelope.versions
      .filter((version) => isMonthAfter(version.effectiveFrom, currentMonth))
      .sort((a, b) => compareMonths(a.effectiveFrom, b.effectiveFrom))[0];

    return {
      id: envelope.id,
      label: displayed?.label ?? "",
      archivedFromLabel: envelope.archivedFrom ? formatFromMonthLabel(envelope.archivedFrom) : null,
      mode: displayed?.mode ?? "amount",
      valueLabel: displayed ? valueLabelOf(displayed) : "—",
      amountEuros: displayed?.mode === "amount" ? moneyToEuros(displayed.value) : null,
      percentage: displayed?.mode === "percentage" ? displayed.value : null,
      upcoming: upcoming
        ? {
            valueLabel: valueLabelOf(upcoming),
            fromLabel: formatFromMonthLabel(upcoming.effectiveFrom),
          }
        : null,
    };
  });

  const activePercentageSum = envelopes.reduce((sum, envelope) => {
    const displayed = activeVersionAt(envelope, currentMonth);
    return displayed?.mode === "percentage" ? sum + displayed.value : sum;
  }, 0);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="sr-only">Enveloppes variables</h2>
      <EnvelopeTable rows={rows} activePercentageSum={activePercentageSum} />
    </div>
  );
}
