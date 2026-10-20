import {
  findBudgetMonthByMonth,
  findClosedBudgetMonthsByUser,
  findOpenBudgetMonthByUser,
  prisma,
} from "@budget/db";
import { formatMonth, isSameMonth, moneyToEuros, parseMonth } from "@budget/domain";
import { SparklesIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReopenMonthForm } from "@/app/(app)/_components/reopen-month-form";
import { Meter } from "@/components/meter";
import { MonthNav } from "@/components/month-nav";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CONSUMPTION_LEVEL_BG_CLASSES,
  CONSUMPTION_LEVEL_LABELS,
  CONSUMPTION_LEVEL_TEXT_CLASSES,
} from "@/lib/alert-level";
import { formatEuros } from "@/lib/format-money";
import { formatMonthLabel } from "@/lib/format-month-label";
import { computeMonthSummary } from "@/lib/month-summary";
import { requireSession } from "@/lib/session";

export default async function HistoryMonthPage({ params }: { params: Promise<{ month: string }> }) {
  const session = await requireSession();
  const { month: monthParam } = await params;

  let viewedMonth: ReturnType<typeof parseMonth>;
  try {
    viewedMonth = parseMonth(monthParam);
  } catch {
    redirect("/history");
  }

  const budgetMonth = await findBudgetMonthByMonth(prisma, session.user.id, viewedMonth);
  if (budgetMonth?.status !== "closed") {
    redirect("/history");
  }

  const [closedMonths, openMonthRow, summary] = await Promise.all([
    findClosedBudgetMonthsByUser(prisma, session.user.id),
    findOpenBudgetMonthByUser(prisma, session.user.id),
    computeMonthSummary(prisma, session.user.id, budgetMonth),
  ]);
  const oldest = closedMonths.at(-1)?.month ?? viewedMonth;
  const newest = closedMonths[0]?.month ?? viewedMonth;
  const isLastClosed = isSameMonth(viewedMonth, newest);
  const canReopen = isLastClosed && !openMonthRow;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/history" className="text-sm text-muted-foreground hover:underline">
            ‹ Historique
          </Link>
          <h1 className="mt-1 flex items-center gap-2.5 font-heading text-[34px] leading-tight">
            {formatMonthLabel(viewedMonth)}
            <Badge>Clôturé</Badge>
          </h1>
          <div className="mt-2.5">
            <MonthNav
              month={viewedMonth}
              min={oldest}
              max={newest}
              buildHref={(m) => `/history/${formatMonth(m)}`}
              showLabel={false}
            />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {canReopen ? (
            <ReopenMonthForm redirectTo="/" />
          ) : (
            <p className="max-w-[240px] text-right text-sm text-muted-foreground">
              Seul le dernier mois clôturé peut être rouvert.
            </p>
          )}
          <Link
            href={`/operations?month=${formatMonth(viewedMonth)}`}
            className="text-sm underline"
          >
            Voir les opérations
          </Link>
        </div>
      </div>

      <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
        <div>
          <p className="text-sm text-muted-foreground">Revenu</p>
          <p className="font-heading text-xl">{formatEuros(moneyToEuros(summary.income))}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Dépensé</p>
          <p className="font-heading text-xl">{formatEuros(moneyToEuros(summary.spent))}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Mis de côté</p>
          <p className="font-heading text-xl">{formatEuros(moneyToEuros(summary.saved))}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Reliquat</p>
          <p
            className={`font-heading text-xl ${summary.leftover.cents < 0 ? "text-destructive" : ""}`}
          >
            {formatEuros(moneyToEuros(summary.leftover))}
          </p>
        </div>
      </Card>

      {summary.convertedUrges.count > 0 ? (
        <p className="text-sm text-muted-foreground">
          <span className="text-positive">
            {formatEuros(moneyToEuros(summary.convertedUrges.total))}
          </span>{" "}
          d'envies converties ({summary.convertedUrges.count}) ce mois-là{" "}
          <SparklesIcon aria-hidden className="inline size-3.5 align-text-bottom" />
        </p>
      ) : null}

      {summary.savingsDraw.cents > 0 ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {formatEuros(moneyToEuros(summary.savingsDraw))} ont été financés par l'épargne à la
          clôture.
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 font-heading text-xl">Enveloppes</h2>
        <Card className="p-0">
          <ul>
            {summary.envelopes.map((entry) => {
              const pct =
                entry.budget.cents > 0 ? (entry.spent.cents / entry.budget.cents) * 100 : 0;
              return (
                <li
                  key={entry.envelopeId}
                  className="flex flex-col gap-1.5 border-b p-4 last:border-b-0"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-semibold">{entry.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.mode === "amount" ? "Montant fixe" : `${entry.value} % de la base`}
                      </p>
                    </div>
                    <p
                      className={`font-heading text-lg ${entry.remaining.cents < 0 ? "text-destructive" : ""}`}
                    >
                      {formatEuros(moneyToEuros(entry.remaining))}
                    </p>
                  </div>
                  <Meter
                    percent={pct}
                    label={`Consommation de ${entry.label}`}
                    className={CONSUMPTION_LEVEL_BG_CLASSES[entry.level]}
                  />
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={CONSUMPTION_LEVEL_TEXT_CLASSES[entry.level]}>
                      {CONSUMPTION_LEVEL_LABELS[entry.level]}
                    </span>
                    <span>
                      {formatEuros(moneyToEuros(entry.spent))} dépensés sur{" "}
                      {formatEuros(moneyToEuros(entry.budget))}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
