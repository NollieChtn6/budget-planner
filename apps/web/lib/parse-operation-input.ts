import { type CalendarDate, type Money, moneyFromEuros, parseCalendarDate } from "@budget/domain";
import { INVALID_AMOUNT, INVALID_DATE } from "@/actions/messages";

/** Turns the raw euros and date strings of an operation form into domain values, or a user-facing error. */
export function parseAmountAndDate(
  amountEuros: number,
  date: string,
): { ok: true; amount: Money; date: CalendarDate } | { ok: false; message: string } {
  let amount: Money;
  try {
    amount = moneyFromEuros(amountEuros);
  } catch {
    return { ok: false, message: INVALID_AMOUNT };
  }

  let parsedDate: CalendarDate;
  try {
    parsedDate = parseCalendarDate(date);
  } catch {
    return { ok: false, message: INVALID_DATE };
  }

  return { ok: true, amount, date: parsedDate };
}
