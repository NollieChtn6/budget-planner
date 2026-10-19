import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "../calendar-date";
import { moneyFromEuros } from "../money";
import { parseMonth } from "../month";
import {
  type RecordSavingsTransferContext,
  type RecordSavingsTransferInput,
  recordSavingsTransfer,
} from "./savings-transfer";

const context: RecordSavingsTransferContext = { currentMonth: parseMonth("2026-10") };

function baseInput(
  overrides: Partial<RecordSavingsTransferInput> = {},
): RecordSavingsTransferInput {
  return {
    date: parseCalendarDate("2026-10-12"),
    amount: moneyFromEuros(40),
    ...overrides,
  };
}

describe("recordSavingsTransfer", () => {
  it("accepts a transfer without label (E18)", () => {
    expect(recordSavingsTransfer(baseInput(), context)).toEqual({
      ok: true,
      savingsTransfer: { date: parseCalendarDate("2026-10-12"), amount: moneyFromEuros(40) },
    });
  });

  it("keeps a trimmed label and drops a blank one", () => {
    const withLabel = recordSavingsTransfer(baseInput({ label: " Livret A " }), context);
    expect(withLabel.ok && withLabel.savingsTransfer.label).toBe("Livret A");
    const blank = recordSavingsTransfer(baseInput({ label: "  " }), context);
    expect(blank.ok && "label" in blank.savingsTransfer).toBe(false);
  });

  it("rejects a zero amount", () => {
    expect(recordSavingsTransfer(baseInput({ amount: moneyFromEuros(0) }), context)).toEqual({
      ok: false,
      error: { type: "invalidAmount" },
    });
  });

  it("rejects a date outside the current month (R3)", () => {
    expect(
      recordSavingsTransfer(baseInput({ date: parseCalendarDate("2026-11-01") }), context),
    ).toEqual({ ok: false, error: { type: "dateOutsideCurrentMonth" } });
  });
});
