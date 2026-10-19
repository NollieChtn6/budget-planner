import { type CalendarDate, monthOfCalendarDate } from "../calendar-date";
import { type Money, moneyToCents } from "../money";
import { isSameMonth, type Month } from "../month";

export type SavingsTransfer = {
  id: string;
  date: CalendarDate;
  amount: Money;
  label?: string;
};

export type RecordSavingsTransferInput = {
  date: CalendarDate;
  amount: Money;
  label?: string;
};

export type RecordSavingsTransferContext = {
  currentMonth: Month;
};

export type RecordSavingsTransferFailure =
  | { type: "invalidAmount" }
  | { type: "dateOutsideCurrentMonth" };

export type RecordSavingsTransferResult =
  | { ok: true; savingsTransfer: Omit<SavingsTransfer, "id"> }
  | { ok: false; error: RecordSavingsTransferFailure };

/**
 * R37, R3: a savings transfer is attached to the budget month of its date and
 * taken from the disposable income. Going over the disposable income only
 * warns (decided by the caller), it never blocks.
 */
export function recordSavingsTransfer(
  input: RecordSavingsTransferInput,
  context: RecordSavingsTransferContext,
): RecordSavingsTransferResult {
  if (moneyToCents(input.amount) <= 0) {
    return { ok: false, error: { type: "invalidAmount" } };
  }

  if (!isSameMonth(monthOfCalendarDate(input.date), context.currentMonth)) {
    return { ok: false, error: { type: "dateOutsideCurrentMonth" } };
  }

  const label = input.label?.trim();
  return {
    ok: true,
    savingsTransfer: {
      date: input.date,
      amount: input.amount,
      ...(label ? { label } : {}),
    },
  };
}
