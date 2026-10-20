/** Today in the user's own timezone, as `YYYY-MM-DD` (`toISOString` would give the UTC day). */
function localToday(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The date a new operation starts with: today, kept inside the month it can be entered in. */
export function defaultOperationDate(minDate: string, maxDate: string, now = new Date()): string {
  const today = localToday(now);
  if (today < minDate) return minDate;
  if (today > maxDate) return maxDate;
  return today;
}
