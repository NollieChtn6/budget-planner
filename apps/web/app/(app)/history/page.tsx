import { findClosedBudgetMonthsByUser, prisma } from "@budget/db";
import {
  addMoney,
  formatMonth,
  isSameMonth,
  type Money,
  moneyFromCents,
  moneyToEuros,
} from "@budget/domain";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatEuros } from "@/lib/format-money";
import { formatMonthLabel } from "@/lib/format-month-label";
import { computeMonthSummary } from "@/lib/month-summary";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

function StatTile({ label, value }: { label: string; value: Money }) {
  return (
    <Card className="gap-1 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("font-heading text-xl", value.cents < 0 && "text-destructive")}>
        {formatEuros(moneyToEuros(value))}
      </p>
    </Card>
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await requireSession();
  const { year: yearParam } = await searchParams;
  const closedMonths = await findClosedBudgetMonthsByUser(prisma, session.user.id);

  if (closedMonths.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-[34px] leading-tight">Historique</h1>
        <p className="text-sm text-muted-foreground">
          Aucun mois clôturé pour l'instant. Tes mois apparaîtront ici une fois clôturés.
        </p>
      </div>
    );
  }

  const years = [...new Set(closedMonths.map((m) => m.month.year))].sort((a, b) => b - a);
  const requestedYear = yearParam ? Number(yearParam) : Number.NaN;
  const selectedYear = years.includes(requestedYear) ? requestedYear : years[0];
  const monthsThisYear = closedMonths.filter((m) => m.month.year === selectedYear);
  const lastClosedMonth = closedMonths[0]?.month;

  const summaries = await Promise.all(
    monthsThisYear.map((m) => computeMonthSummary(prisma, session.user.id, m)),
  );

  const zero = moneyFromCents(0);
  const totals = summaries.reduce(
    (acc, s) => ({
      income: addMoney(acc.income, s.income),
      spent: addMoney(acc.spent, s.spent),
      saved: addMoney(acc.saved, s.saved),
      leftover: addMoney(acc.leftover, s.leftover),
      convertedUrges: addMoney(acc.convertedUrges, s.convertedUrges.total),
      convertedUrgesCount: acc.convertedUrgesCount + s.convertedUrges.count,
    }),
    {
      income: zero,
      spent: zero,
      saved: zero,
      leftover: zero,
      convertedUrges: zero,
      convertedUrgesCount: 0,
    },
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-[34px] leading-tight">Historique</h1>
          <p className="mt-1.5 text-muted-foreground">
            Tes mois clôturés, consultables en lecture seule.
          </p>
        </div>
        {years.length > 1 ? (
          <div className="flex gap-1.5">
            {years.map((year) => (
              <Link
                key={year}
                href={`/history?year=${year}`}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm",
                  year === selectedYear
                    ? "bg-muted font-semibold"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {year}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={`Revenus ${selectedYear}`} value={totals.income} />
        <StatTile label="Dépensé" value={totals.spent} />
        <StatTile label="Mis de côté" value={totals.saved} />
        <StatTile label="Reliquats cumulés" value={totals.leftover} />
      </div>

      {totals.convertedUrgesCount > 0 ? (
        <Card className="gap-1 p-4">
          <p className="text-sm text-muted-foreground">
            <span aria-hidden>✨ </span>
            Envies converties {selectedYear}
          </p>
          <p className="font-heading text-xl text-positive">
            {formatEuros(moneyToEuros(totals.convertedUrges))}
          </p>
          <p className="text-sm text-muted-foreground">
            {totals.convertedUrgesCount} achat{totals.convertedUrgesCount > 1 ? "s" : ""} transformé
            {totals.convertedUrgesCount > 1 ? "s" : ""} en épargne
          </p>
        </Card>
      ) : null}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Mois</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Revenu</th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Dépensé
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Mis de côté
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                  Reliquat
                </th>
              </tr>
            </thead>
            <tbody>
              {monthsThisYear.map((m, index) => {
                const summary = summaries[index];
                if (!summary) return null;
                const isLast = lastClosedMonth && isSameMonth(m.month, lastClosedMonth);
                return (
                  <tr
                    key={formatMonth(m.month)}
                    className="border-b last:border-b-0 hover:bg-muted"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/history/${formatMonth(m.month)}`}
                        className="font-semibold hover:underline"
                      >
                        {formatMonthLabel(m.month)}
                      </Link>
                      {isLast ? <Badge className="ml-2">Dernier clôturé</Badge> : null}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatEuros(moneyToEuros(summary.income))}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatEuros(moneyToEuros(summary.spent))}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatEuros(moneyToEuros(summary.saved))}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right",
                        summary.leftover.cents < 0 && "text-destructive",
                      )}
                    >
                      {formatEuros(moneyToEuros(summary.leftover))}
                      {summary.savingsDraw.cents > 0 ? (
                        <Badge variant="negative" className="ml-2">
                          via l'épargne
                        </Badge>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
