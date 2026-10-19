import { type CalendarDate, monthOfCalendarDate } from "../calendar-date";
import { type Money, moneyToCents, sumMoney } from "../money";
import { isSameMonth, type Month } from "../month";

/** R38: `convertedUrge` is a purchase the user gave up, with the same amount set aside. */
export type SavingsTransferKind = "free" | "convertedUrge";

export type SavingsTransfer = {
  id: string;
  date: CalendarDate;
  amount: Money;
  kind: SavingsTransferKind;
  label?: string;
};

export type RecordSavingsTransferInput = {
  date: CalendarDate;
  amount: Money;
  kind?: SavingsTransferKind;
  label?: string;
};

export type RecordSavingsTransferContext = {
  currentMonth: Month;
};

export type RecordSavingsTransferFailure =
  | { type: "invalidAmount" }
  | { type: "dateOutsideCurrentMonth" }
  | { type: "missingLabel" };

export type RecordSavingsTransferResult =
  | { ok: true; savingsTransfer: Omit<SavingsTransfer, "id"> }
  | { ok: false; error: RecordSavingsTransferFailure };

/**
 * R37, R3: a savings transfer is attached to the budget month of its date and
 * taken from the disposable income. Going over the disposable income only
 * warns (decided by the caller), it never blocks. R38: a converted urge must
 * say what was given up, so its label is required.
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

  const kind = input.kind ?? "free";
  const label = input.label?.trim();
  if (kind === "convertedUrge" && !label) {
    return { ok: false, error: { type: "missingLabel" } };
  }

  return {
    ok: true,
    savingsTransfer: {
      date: input.date,
      amount: input.amount,
      kind,
      ...(label ? { label } : {}),
    },
  };
}

export type ConvertedUrgesSummary = { total: Money; count: number };

/** R38: total and number of converted urges among a month's savings transfers. */
export function summarizeConvertedUrges(
  savingsTransfers: Pick<SavingsTransfer, "amount" | "kind">[],
): ConvertedUrgesSummary {
  const convertedUrges = savingsTransfers.filter((transfer) => transfer.kind === "convertedUrge");
  return {
    total: sumMoney(convertedUrges.map((transfer) => transfer.amount)),
    count: convertedUrges.length,
  };
}
