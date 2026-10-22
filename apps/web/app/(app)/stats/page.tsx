import {
  findCategoriesByUser,
  findClosedBudgetMonthsByUser,
  findExpensesByUserBetweenMonths,
  findOpenBudgetMonthByUser,
  findReimbursementsForStats,
  prisma,
} from "@budget/db";
import {
  computeCategoryStats,
  type Month,
  moneyToEuros,
  type StatsPeriod,
  selectStatsMonths,
} from "@budget/domain";
import Link from "next/link";
import { Meter } from "@/components/meter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEuros } from "@/lib/format-money";
import { formatMonthLabel } from "@/lib/format-month-label";
import { requireSession } from "@/lib/session";
import { parseStatsPeriod, STATS_PERIOD_LENGTHS, statsPeriodHref } from "@/lib/stats-search-params";
import { cn } from "@/lib/utils";

const FILTER_LINK_CLASS = "rounded-lg border px-3 py-1.5 text-sm";

function periodLabel(length: StatsPeriod["length"]): string {
  return length === "all" ? "Tout" : `${length} mois`;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; active?: string }>;
}) {
  const session = await requireSession();
  const period = parseStatsPeriod(await searchParams);
  const userId = session.user.id;

  const [closedMonths, openMonth, categories] = await Promise.all([
    findClosedBudgetMonthsByUser(prisma, userId),
    findOpenBudgetMonthByUser(prisma, userId),
    findCategoriesByUser(prisma, userId),
  ]);

  const months = selectStatsMonths(
    closedMonths.map((m) => m.month),
    openMonth?.month,
    period,
  );
  const firstMonth: Month | undefined = months[0];
  const lastMonth: Month | undefined = months[months.length - 1];

  const expenses =
    firstMonth && lastMonth
      ? await findExpensesByUserBetweenMonths(prisma, userId, firstMonth, lastMonth)
      : [];
  const reimbursements =
    firstMonth && lastMonth
      ? await findReimbursementsForStats(
          prisma,
          userId,
          firstMonth,
          lastMonth,
          expenses.map((expense) => expense.id),
        )
      : [];
  const stats = computeCategoryStats({ categories, expenses, reimbursements, months });

  const activeMonthIncluded = period.includeActiveMonth && openMonth !== null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-[34px] leading-tight">Statistiques</h1>
        <p className="mt-1.5 text-muted-foreground">
          Ce que tu as réellement dépensé par catégorie, remboursements déduits.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <nav className="flex flex-wrap gap-1.5" aria-label="Période">
          {STATS_PERIOD_LENGTHS.map((length) => {
            const selected = length === period.length;
            return (
              <Link
                key={length}
                href={statsPeriodHref({ ...period, length })}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  FILTER_LINK_CLASS,
                  selected ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {length === "all" ? "Tout" : `${length} derniers mois`}
              </Link>
            );
          })}
        </nav>
        <Link
          href={statsPeriodHref({ ...period, includeActiveMonth: !period.includeActiveMonth })}
          className={cn(FILTER_LINK_CLASS, "text-muted-foreground hover:bg-muted")}
        >
          {period.includeActiveMonth ? "Exclure" : "Inclure"} le mois en cours
        </Link>
      </div>

      {!firstMonth || !lastMonth ? (
        <p className="text-sm text-muted-foreground">Aucun mois sur cette période.</p>
      ) : (
        <Card className="gap-3 p-0">
          <div className="flex flex-wrap items-center gap-2 px-4 pt-4 text-sm text-muted-foreground">
            <span>
              {periodLabel(period.length)} :{" "}
              {months.length === 1
                ? formatMonthLabel(firstMonth)
                : `${formatMonthLabel(firstMonth)} → ${formatMonthLabel(lastMonth)}`}
            </span>
            {activeMonthIncluded ? (
              <Badge>Mois en cours inclus : moyennes approximatives</Badge>
            ) : null}
          </div>

          {stats.rows.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              Aucune dépense sur cette période.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Dépensé</TableHead>
                  <TableHead className="text-right">Part</TableHead>
                  <TableHead className="text-right">Par mois</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.rows.map((row) => (
                  <TableRow key={row.category.id}>
                    <TableCell className="min-w-40">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{row.category.label}</span>
                        {row.category.archived ? <Badge>archivée</Badge> : null}
                      </div>
                      <Meter
                        className="mt-1.5"
                        color={row.category.color}
                        percent={row.share}
                        label={`Part de ${row.category.label}`}
                        valueText={`${Math.round(row.share)} % du total`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {formatEuros(moneyToEuros(row.net))}
                      {row.reimbursed.cents > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {formatEuros(moneyToEuros(row.gross))} dépensés,{" "}
                          {formatEuros(moneyToEuros(row.reimbursed))} remboursés
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">{Math.round(row.share)} %</TableCell>
                    <TableCell className="text-right">
                      {formatEuros(moneyToEuros(row.monthlyAverage))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatEuros(moneyToEuros(stats.total))}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
