export const PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

/** Any value outside the offered sizes falls back to the default, so a hand-edited URL stays harmless. */
export function parsePageSize(value: string | undefined): number {
  const size = Number(value);
  return PAGE_SIZES.find((allowed) => allowed === size) ?? DEFAULT_PAGE_SIZE;
}

/** The requested page, clamped into 1..pageCount (an empty list still has one page). */
export function clampPage(value: string | undefined, itemCount: number, pageSize: number): number {
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  const page = Math.trunc(Number(value));
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, pageCount);
}
