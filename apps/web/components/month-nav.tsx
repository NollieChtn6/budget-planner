import { isSameMonth, type Month, nextMonth, previousMonth } from "@budget/domain";
import Link from "next/link";
import { formatMonthLabel } from "@/lib/format-month-label";

/** Previous/next month navigator, clamped to [min, max] (charte's monthnav). */
export function MonthNav({
  month,
  min,
  max,
  buildHref,
}: {
  month: Month;
  min: Month;
  max: Month;
  buildHref: (month: Month) => string;
}) {
  const atMin = isSameMonth(month, min);
  const atMax = isSameMonth(month, max);

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border bg-card px-1 text-sm">
      {atMin ? (
        <span className="px-2 py-1.5 text-muted-foreground/40" aria-hidden="true">
          ‹
        </span>
      ) : (
        <Link
          href={buildHref(previousMonth(month))}
          className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Mois précédent"
        >
          ‹
        </Link>
      )}
      <span className="min-w-[120px] px-1 text-center font-semibold">
        {formatMonthLabel(month)}
      </span>
      {atMax ? (
        <span className="px-2 py-1.5 text-muted-foreground/40" aria-hidden="true">
          ›
        </span>
      ) : (
        <Link
          href={buildHref(nextMonth(month))}
          className="rounded-md px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Mois suivant"
        >
          ›
        </Link>
      )}
    </div>
  );
}
