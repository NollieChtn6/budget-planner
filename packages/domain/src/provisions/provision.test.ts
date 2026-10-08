import { describe, expect, it } from "vitest";
import { moneyFromEuros, moneyToCents } from "../money";
import { type Month, nextMonth, parseMonth, previousMonth } from "../month";
import {
  archiveProvision,
  closeProvision,
  computeMonthlyTarget,
  dueMonth,
  isProvisionExhaustedBy,
  type Provision,
  renewProvision,
  unarchiveProvision,
} from "./provision";

function deadlineProvision(
  id: string,
  label: string,
  startMonth: string,
  durationMonths: number,
  targetEuros: number,
  archivedFrom?: Month,
): Provision & { type: "deadline" } {
  return {
    id,
    label,
    type: "deadline",
    target: moneyFromEuros(targetEuros),
    startMonth: parseMonth(startMonth),
    durationMonths,
    status: "active",
    ...(archivedFrom ? { archivedFrom } : {}),
  };
}

function reserveProvision(
  id: string,
  label: string,
  targetEuros: number,
  monthlyAmountEuros: number,
  archivedFrom?: Month,
): Provision & { type: "reserve" } {
  return {
    id,
    label,
    type: "reserve",
    target: moneyFromEuros(targetEuros),
    monthlyAmount: moneyFromEuros(monthlyAmountEuros),
    status: "active",
    ...(archivedFrom ? { archivedFrom } : {}),
  };
}

describe("dueMonth — R17", () => {
  it("computes the last month of construction (E3: Orthodontie, 6 months)", () => {
    const provision = deadlineProvision("orthodontie", "Orthodontie", "2026-01", 6, 400);
    expect(dueMonth(provision)).toEqual(parseMonth("2026-06"));
  });

  it("computes the last month of construction (E3: Vacances, 10 months)", () => {
    const provision = deadlineProvision("vacances", "Vacances", "2026-01", 10, 700);
    expect(dueMonth(provision)).toEqual(parseMonth("2026-10"));
  });

  it("handles a duration that crosses a year boundary", () => {
    const provision = deadlineProvision("a", "A", "2026-10", 5, 500);
    expect(dueMonth(provision)).toEqual(parseMonth("2027-02"));
  });
});

describe("computeMonthlyTarget — deadline, R18", () => {
  it("computes the first month's target with no balance yet (E3: Orthodontie)", () => {
    const provision = deadlineProvision("orthodontie", "Orthodontie", "2026-01", 6, 400);
    const target = computeMonthlyTarget(provision, parseMonth("2026-01"), moneyFromEuros(0));
    expect(moneyToCents(target)).toBe(6667);
  });

  it("computes the first month's target with no balance yet (E3: Vacances)", () => {
    const provision = deadlineProvision("vacances", "Vacances", "2026-01", 10, 700);
    const target = computeMonthlyTarget(provision, parseMonth("2026-01"), moneyFromEuros(0));
    expect(moneyToCents(target)).toBe(7000);
  });

  it("recomputes the target from the remaining balance (E6: Orthodontie, 100€ balance)", () => {
    const provision = deadlineProvision("orthodontie", "Orthodontie", "2026-01", 6, 400);
    const target = computeMonthlyTarget(provision, parseMonth("2026-02"), moneyFromEuros(100));
    expect(moneyToCents(target)).toBe(6000);
  });

  it("absorbs the rounding gap at the last month (E7)", () => {
    const provision = deadlineProvision("orthodontie", "Orthodontie", "2026-01", 6, 400);
    // 5 exact monthly contributions of 66.67€ leave a balance of 333.35€.
    const balance = moneyFromEuros(333.35);
    const target = computeMonthlyTarget(provision, parseMonth("2026-06"), balance);
    expect(moneyToCents(target)).toBe(6665);
  });

  it("returns 0 once the balance reaches the target", () => {
    const provision = deadlineProvision("orthodontie", "Orthodontie", "2026-01", 6, 400);
    const target = computeMonthlyTarget(provision, parseMonth("2026-03"), moneyFromEuros(400));
    expect(moneyToCents(target)).toBe(0);
  });

  it("returns 0 when the balance exceeds the target", () => {
    const provision = deadlineProvision("orthodontie", "Orthodontie", "2026-01", 6, 400);
    const target = computeMonthlyTarget(provision, parseMonth("2026-02"), moneyFromEuros(433.33));
    expect(moneyToCents(target)).toBe(0);
  });
});

describe("computeMonthlyTarget — reserve, R21", () => {
  it("targets the monthly amount when far from the ceiling (E3: Imprévus)", () => {
    const provision = reserveProvision("imprevus", "Imprévus", 250, 50);
    const target = computeMonthlyTarget(provision, parseMonth("2026-01"), moneyFromEuros(0));
    expect(moneyToCents(target)).toBe(5000);
  });

  it("targets the monthly amount again once the balance is emptied (E11: Imprévus)", () => {
    const provision = reserveProvision("imprevus", "Imprévus", 250, 50);
    const target = computeMonthlyTarget(provision, parseMonth("2026-02"), moneyFromEuros(0));
    expect(moneyToCents(target)).toBe(5000);
  });

  it("caps the target below the monthly amount close to the ceiling", () => {
    const provision = reserveProvision("imprevus", "Imprévus", 250, 50);
    const target = computeMonthlyTarget(provision, parseMonth("2026-02"), moneyFromEuros(230));
    expect(moneyToCents(target)).toBe(2000);
  });

  it("returns 0 once the balance reaches the ceiling", () => {
    const provision = reserveProvision("imprevus", "Imprévus", 250, 50);
    const target = computeMonthlyTarget(provision, parseMonth("2026-02"), moneyFromEuros(250));
    expect(moneyToCents(target)).toBe(0);
  });
});

describe("archiveProvision — R8", () => {
  const currentMonth = parseMonth("2026-03");
  const provision = deadlineProvision("orthodontie", "Orthodontie", "2026-01", 6, 400);

  it("allows the current month when there are no operations yet", () => {
    const result = archiveProvision(
      provision,
      { effectiveFrom: currentMonth, hasOperationsInCurrentMonth: false },
      currentMonth,
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.provision.archivedFrom).toEqual(currentMonth);
  });

  it("allows the next month regardless of operations", () => {
    const result = archiveProvision(
      provision,
      { effectiveFrom: nextMonth(currentMonth), hasOperationsInCurrentMonth: true },
      currentMonth,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects the current month when operations already exist", () => {
    const result = archiveProvision(
      provision,
      { effectiveFrom: currentMonth, hasOperationsInCurrentMonth: true },
      currentMonth,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.type).toBe("invalidArchiveDate");
  });
});

describe("unarchiveProvision — R8", () => {
  const currentMonth = parseMonth("2026-03");

  it("allows unarchiving before the archive date takes effect", () => {
    const archived = reserveProvision("imprevus", "Imprévus", 250, 50, nextMonth(currentMonth));
    const result = unarchiveProvision(archived, currentMonth);
    expect(result.ok).toBe(true);
    expect(result.ok && result.provision.archivedFrom).toBeUndefined();
  });

  it("rejects when the archive date is the current month", () => {
    const archived = reserveProvision("imprevus", "Imprévus", 250, 50, currentMonth);
    const result = unarchiveProvision(archived, currentMonth);
    expect(result.ok).toBe(false);
  });

  it("rejects when the archive date is in the past", () => {
    const archived = reserveProvision("imprevus", "Imprévus", 250, 50, previousMonth(currentMonth));
    const result = unarchiveProvision(archived, currentMonth);
    expect(result.ok).toBe(false);
  });

  it("rejects when the provision isn't archived", () => {
    const notArchived = reserveProvision("imprevus", "Imprévus", 250, 50);
    const result = unarchiveProvision(notArchived, currentMonth);
    expect(result.ok).toBe(false);
  });
});

describe("isProvisionExhaustedBy — R23", () => {
  const deadline = deadlineProvision("orthodontie", "Orthodontie", "2026-01", 6, 400);
  const reserve = reserveProvision("imprevus", "Imprévus", 250, 50);

  it("is true when a deadline provision's balance drops from positive to 0 (E12)", () => {
    expect(isProvisionExhaustedBy(deadline, moneyFromEuros(400), moneyFromEuros(0))).toBe(true);
  });

  it("is false when the balance was already 0", () => {
    expect(isProvisionExhaustedBy(deadline, moneyFromEuros(0), moneyFromEuros(0))).toBe(false);
  });

  it("is false when the balance stays positive", () => {
    expect(isProvisionExhaustedBy(deadline, moneyFromEuros(400), moneyFromEuros(100))).toBe(false);
  });

  it("is false for a reserve (R23: never prompted)", () => {
    expect(isProvisionExhaustedBy(reserve, moneyFromEuros(250), moneyFromEuros(0))).toBe(false);
  });

  it("is false for an already-closed provision", () => {
    expect(
      isProvisionExhaustedBy(
        { ...deadline, status: "closed" },
        moneyFromEuros(400),
        moneyFromEuros(0),
      ),
    ).toBe(false);
  });
});

describe("closeProvision — R23", () => {
  it("closes a deadline provision", () => {
    const provision = deadlineProvision("orthodontie", "Orthodontie", "2026-01", 6, 400);
    const result = closeProvision(provision);
    expect(result).toEqual({ ok: true, provision: { ...provision, status: "closed" } });
  });

  it("rejects a reserve", () => {
    const provision = reserveProvision("imprevus", "Imprévus", 250, 50);
    const result = closeProvision(provision);
    expect(result).toEqual({ ok: false, error: { type: "notDeadlineProvision" } });
  });
});

describe("renewProvision — R23", () => {
  it("closes the current cycle and starts an identical one next month", () => {
    const provision = deadlineProvision("orthodontie", "Orthodontie", "2026-01", 6, 400);
    const result = renewProvision(provision, parseMonth("2026-06"));
    expect(result).toEqual({
      ok: true,
      closedProvision: { ...provision, status: "closed" },
      newProvision: {
        label: "Orthodontie",
        type: "deadline",
        target: moneyFromEuros(400),
        startMonth: parseMonth("2026-07"),
        durationMonths: 6,
        previousCycleId: "orthodontie",
      },
    });
  });

  it("rejects a reserve", () => {
    const provision = reserveProvision("imprevus", "Imprévus", 250, 50);
    const result = renewProvision(provision, parseMonth("2026-06"));
    expect(result).toEqual({ ok: false, error: { type: "notDeadlineProvision" } });
  });
});
