import { isSameMonth, type Month, nextMonth, previousMonth } from "@budget/domain";
import Link from "next/link";
import { formatMonthLabel } from "@/lib/format-month-label";

/** Arrows are 44px wide and high on touch screens. */
const ARROW_CLASS = "inline-flex items-center justify-center rounded-md px-2 py-1.5 max-md:size-11";

/** Previous/next month navigator, clamped to [min, max] (charte's monthnav). */
export function MonthNav({
  month,
  min,
  max,
  buildHref,
  showLabel = true,
}: {
  month: Month;
  min: Month;
  max: Month;
  buildHref: (month: Month) => string;
  /** Hide the centered month name, e.g. when a heading already shows it. */
  showLabel?: boolean;
}) {
  const atMin = isSameMonth(month, min);
  const atMax = isSameMonth(month, max);

  return (
    <nav
      aria-label="Mois affiché"
      className="inline-flex items-center gap-1 rounded-lg border bg-card px-1 text-sm"
    >
      {atMin ? (
        <span className={`${ARROW_CLASS} text-muted-foreground/40`}>
          <span aria-hidden="true">‹</span>
          <span className="sr-only">Pas de mois plus ancien</span>
        </span>
      ) : (
        <Link
          href={buildHref(previousMonth(month))}
          className={`${ARROW_CLASS} text-muted-foreground hover:bg-muted hover:text-foreground`}
          aria-label="Mois précédent"
        >
          ‹
        </Link>
      )}
      {showLabel ? (
        <span className="min-w-[120px] px-1 text-center font-semibold">
          {formatMonthLabel(month)}
        </span>
      ) : null}
      {atMax ? (
        <span className={`${ARROW_CLASS} text-muted-foreground/40`}>
          <span aria-hidden="true">›</span>
          <span className="sr-only">Pas de mois plus récent</span>
        </span>
      ) : (
        <Link
          href={buildHref(nextMonth(month))}
          className={`${ARROW_CLASS} text-muted-foreground hover:bg-muted hover:text-foreground`}
          aria-label="Mois suivant"
        >
          ›
        </Link>
      )}
    </nav>
  );
}
