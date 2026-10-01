import { type Month, parseMonth } from "@budget/domain";

/** The real calendar month, read from the system clock (never from client input). */
export function resolveCurrentMonth(): Month {
  const now = new Date();
  const year = now.getFullYear().toString().padStart(4, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  return parseMonth(`${year}-${month}`);
}
