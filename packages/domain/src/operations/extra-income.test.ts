import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "../calendar-date";
import { moneyFromEuros } from "../money";
import { parseMonth } from "../month";
import {
  type RecordExtraIncomeContext,
  type RecordExtraIncomeInput,
  recordExtraIncome,
} from "./extra-income";

const context: RecordExtraIncomeContext = { currentMonth: parseMonth("2026-10") };

function baseInput(overrides: Partial<RecordExtraIncomeInput> = {}): RecordExtraIncomeInput {
  return {
    date: parseCalendarDate("2026-10-12"),
    amount: moneyFromEuros(100),
    label: "  Chèque cadeau ",
    ...overrides,
  };
}

describe("recordExtraIncome", () => {
  it("accepts an extra income received in the current month and trims its label (E18)", () => {
    expect(recordExtraIncome(baseInput(), context)).toEqual({
      ok: true,
      extraIncome: {
        date: parseCalendarDate("2026-10-12"),
        amount: moneyFromEuros(100),
        label: "Chèque cadeau",
      },
    });
  });

  it("rejects a zero amount", () => {
    expect(recordExtraIncome(baseInput({ amount: moneyFromEuros(0) }), context)).toEqual({
      ok: false,
      error: { type: "invalidAmount" },
    });
  });

  it("rejects an empty label", () => {
    expect(recordExtraIncome(baseInput({ label: "   " }), context)).toEqual({
      ok: false,
      error: { type: "emptyLabel" },
    });
  });

  it("rejects a date outside the current month (R3)", () => {
    expect(
      recordExtraIncome(baseInput({ date: parseCalendarDate("2026-09-30") }), context),
    ).toEqual({ ok: false, error: { type: "dateOutsideCurrentMonth" } });
  });
});
