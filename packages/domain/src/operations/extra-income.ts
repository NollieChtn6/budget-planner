import { type CalendarDate, monthOfCalendarDate } from "../calendar-date";
import { type Money, moneyToCents } from "../money";
import { isSameMonth, type Month } from "../month";

export type ExtraIncome = {
  id: string;
  date: CalendarDate;
  amount: Money;
  label: string;
};

export type RecordExtraIncomeInput = {
  date: CalendarDate;
  amount: Money;
  label: string;
};

export type RecordExtraIncomeContext = {
  currentMonth: Month;
};

export type RecordExtraIncomeFailure =
  | { type: "invalidAmount" }
  | { type: "emptyLabel" }
  | { type: "dateOutsideCurrentMonth" };

export type RecordExtraIncomeResult =
  | { ok: true; extraIncome: Omit<ExtraIncome, "id"> }
  | { ok: false; error: RecordExtraIncomeFailure };

/** R36, R3: an extra income is attached to the budget month of its date of receipt. */
export function recordExtraIncome(
  input: RecordExtraIncomeInput,
  context: RecordExtraIncomeContext,
): RecordExtraIncomeResult {
  if (moneyToCents(input.amount) <= 0) {
    return { ok: false, error: { type: "invalidAmount" } };
  }

  const label = input.label.trim();
  if (label === "") {
    return { ok: false, error: { type: "emptyLabel" } };
  }

  if (!isSameMonth(monthOfCalendarDate(input.date), context.currentMonth)) {
    return { ok: false, error: { type: "dateOutsideCurrentMonth" } };
  }

  return { ok: true, extraIncome: { date: input.date, amount: input.amount, label } };
}
