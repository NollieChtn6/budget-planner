import { findClosedBudgetMonthsByUser, prisma } from "@budget/db";
import { formatMonth, moneyToEuros } from "@budget/domain";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveCurrentMonth } from "@/lib/current-month";
import { requireSession } from "@/lib/session";

function euros(amount: number): string {
  return `${amount.toFixed(2)} €`;
}

export default async function MonthHistoryPage() {
  const session = await requireSession();
  const closedMonths = await findClosedBudgetMonthsByUser(prisma, session.user.id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Historique des mois</h1>
      <Link href={`/months/${formatMonth(resolveCurrentMonth())}`} className="text-sm underline">
        Mois en cours
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Mois clôturés</CardTitle>
        </CardHeader>
        <CardContent>
          {closedMonths.length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm">
              {closedMonths.map((month) => (
                <li key={formatMonth(month.month)}>
                  <Link
                    href={`/months/${formatMonth(month.month)}`}
                    className="flex justify-between underline"
                  >
                    <span>{formatMonth(month.month)}</span>
                    <span>Revenu {euros(moneyToEuros(month.income))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun mois clôturé pour l'instant.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
