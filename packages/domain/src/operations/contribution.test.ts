import { describe, expect, it } from "vitest";
import { parseCalendarDate } from "../calendar-date";
import { moneyFromEuros } from "../money";
import { parseMonth } from "../month";
import {
  type RecordContributionContext,
  type RecordContributionInput,
  recordContribution,
} from "./contribution";

const currentMonth = parseMonth("2026-10");

const context: RecordContributionContext = {
  currentMonth,
  snapshotProvisionIds: ["p1"],
};

function baseInput(overrides: Partial<RecordContributionInput> = {}): RecordContributionInput {
  return {
    date: parseCalendarDate("2026-10-05"),
    amount: moneyFromEuros(100),
    provisionId: "p1",
    ...overrides,
  };
}

describe("recordContribution", () => {
  it("accepts a valid contribution to a snapshot provision", () => {
    const result = recordContribution(baseInput(), context);
    expect(result).toEqual({
      ok: true,
      contribution: {
        date: parseCalendarDate("2026-10-05"),
        amount: moneyFromEuros(100),
        provisionId: "p1",
        origin: "manual",
      },
    });
  });

  it("rejects a zero amount", () => {
    const result = recordContribution(baseInput({ amount: moneyFromEuros(0) }), context);
    expect(result).toEqual({ ok: false, error: { type: "invalidAmount" } });
  });

  it("rejects a date outside the current month (R3)", () => {
    const result = recordContribution(
      baseInput({ date: parseCalendarDate("2026-09-30") }),
      context,
    );
    expect(result).toEqual({ ok: false, error: { type: "dateOutsideCurrentMonth" } });
  });

  it("rejects a provision that isn't part of this month's snapshot", () => {
    const result = recordContribution(baseInput({ provisionId: "unknown" }), context);
    expect(result).toEqual({ ok: false, error: { type: "provisionNotInSnapshot" } });
  });
});
