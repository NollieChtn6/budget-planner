import { findVariableEnvelopesByUser, prisma } from "@budget/db";
import { activeVersionAt, formatMonth, moneyToEuros } from "@budget/domain";
import { resolveCurrentMonth } from "@/lib/current-month";
import { formatEuros } from "@/lib/format-money";
import { requireSession } from "@/lib/session";
import { type EnvelopeRowData, EnvelopeTable } from "./envelope-table";

export default async function EnvelopesSettingsPage() {
  const session = await requireSession();
  const envelopes = await findVariableEnvelopesByUser(prisma, session.user.id);
  const currentMonth = resolveCurrentMonth();

  const rows: EnvelopeRowData[] = envelopes.map((envelope) => {
    const displayed =
      activeVersionAt(envelope, currentMonth) ??
      [...envelope.versions].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))[0];

    return {
      id: envelope.id,
      label: envelope.label,
      archivedFrom: envelope.archivedFrom ? formatMonth(envelope.archivedFrom) : null,
      mode: displayed?.mode ?? "amount",
      valueLabel: displayed
        ? displayed.mode === "amount"
          ? formatEuros(moneyToEuros(displayed.value))
          : `${displayed.value} %`
        : "—",
      amountEuros: displayed?.mode === "amount" ? moneyToEuros(displayed.value) : null,
      percentage: displayed?.mode === "percentage" ? displayed.value : null,
    };
  });

  const activePercentageSum = envelopes.reduce((sum, envelope) => {
    const displayed = activeVersionAt(envelope, currentMonth);
    return displayed?.mode === "percentage" ? sum + displayed.value : sum;
  }, 0);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-heading text-xl">Enveloppes variables</h2>
      <EnvelopeTable rows={rows} activePercentageSum={activePercentageSum} />
    </div>
  );
}
