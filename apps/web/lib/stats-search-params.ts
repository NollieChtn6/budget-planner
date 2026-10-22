import type { StatsPeriod, StatsPeriodLength } from "@budget/domain";

export const STATS_PERIOD_LENGTHS: readonly StatsPeriodLength[] = [3, 6, 12, "all"];

const DEFAULT_LENGTH: StatsPeriodLength = 6;

/** The period comes from the URL, so anything unexpected falls back to the defaults (R39). */
export function parseStatsPeriod(params: { period?: string; active?: string }): StatsPeriod {
  const length =
    STATS_PERIOD_LENGTHS.find((candidate) => String(candidate) === params.period) ?? DEFAULT_LENGTH;
  return { length, includeActiveMonth: params.active !== "0" };
}

export function statsPeriodHref(period: StatsPeriod): string {
  const query = new URLSearchParams({ period: String(period.length) });
  if (!period.includeActiveMonth) query.set("active", "0");
  return `/stats?${query.toString()}`;
}
