import { describe, expect, it } from "vitest";
import { moneyFromEuros } from "../money";
import { type Month, nextMonth, parseMonth, previousMonth } from "../month";
import {
  activeFixedEntryVersionAt,
  addFixedEntryVersion,
  archiveFixedEntry,
  type FixedEntry,
  type FixedEntryVersion,
  unarchiveFixedEntry,
} from "./fixed-entry";

function fixedEntry(
  id: string,
  label: string,
  versions: FixedEntryVersion[],
  archivedFrom?: Month,
): FixedEntry {
  return archivedFrom
    ? { id, label, type: "charge", versions, archivedFrom }
    : { id, label, type: "charge", versions };
}

function amountVersion(fixedEntryId: string, month: string, euros: number): FixedEntryVersion {
  return { fixedEntryId, effectiveFrom: parseMonth(month), amount: moneyFromEuros(euros) };
}

describe("activeFixedEntryVersionAt", () => {
  it("returns undefined before the first version", () => {
    const entry = fixedEntry("a", "Loyer", [amountVersion("a", "2026-03", 1000)]);
    expect(activeFixedEntryVersionAt(entry, parseMonth("2026-02"))).toBeUndefined();
  });

  it("picks the latest version whose effectiveFrom is at or before the month", () => {
    const v1 = amountVersion("a", "2026-01", 1000);
    const v2 = amountVersion("a", "2026-03", 1050);
    const entry = fixedEntry("a", "Loyer", [v1, v2]);
    expect(activeFixedEntryVersionAt(entry, parseMonth("2026-02"))).toEqual(v1);
    expect(activeFixedEntryVersionAt(entry, parseMonth("2026-03"))).toEqual(v2);
    expect(activeFixedEntryVersionAt(entry, parseMonth("2026-05"))).toEqual(v2);
  });

  it("resolves normally before archivedFrom and returns undefined at/after it", () => {
    const v1 = amountVersion("a", "2026-01", 1000);
    const entry = fixedEntry("a", "Loyer", [v1], parseMonth("2026-04"));
    expect(activeFixedEntryVersionAt(entry, parseMonth("2026-03"))).toEqual(v1);
    expect(activeFixedEntryVersionAt(entry, parseMonth("2026-04"))).toBeUndefined();
    expect(activeFixedEntryVersionAt(entry, parseMonth("2026-05"))).toBeUndefined();
  });
});

describe("addFixedEntryVersion — R7 (effective date)", () => {
  const currentMonth = parseMonth("2026-03");

  it("accepts the current month", () => {
    const result = addFixedEntryVersion(
      "a",
      { effectiveFrom: currentMonth, amount: moneyFromEuros(1000) },
      currentMonth,
    );
    expect(result.ok).toBe(true);
  });

  it("accepts the next month", () => {
    const result = addFixedEntryVersion(
      "a",
      { effectiveFrom: nextMonth(currentMonth), amount: moneyFromEuros(1000) },
      currentMonth,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects the previous month", () => {
    const result = addFixedEntryVersion(
      "a",
      { effectiveFrom: previousMonth(currentMonth), amount: moneyFromEuros(1000) },
      currentMonth,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.type).toBe("invalidEffectiveDate");
  });

  it("rejects a month further than the next one", () => {
    const result = addFixedEntryVersion(
      "a",
      { effectiveFrom: nextMonth(nextMonth(currentMonth)), amount: moneyFromEuros(1000) },
      currentMonth,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.type).toBe("invalidEffectiveDate");
  });

  it("returns the version attached to the given fixedEntryId on success", () => {
    const result = addFixedEntryVersion(
      "entry-42",
      { effectiveFrom: currentMonth, amount: moneyFromEuros(1000) },
      currentMonth,
    );
    expect(result.ok && result.version).toEqual({
      fixedEntryId: "entry-42",
      effectiveFrom: currentMonth,
      amount: moneyFromEuros(1000),
    });
  });
});

describe("archiveFixedEntry — R8", () => {
  const currentMonth = parseMonth("2026-03");
  const entry = fixedEntry("a", "Loyer", [amountVersion("a", "2026-01", 1000)]);

  it("allows the current month when there are no operations yet", () => {
    const result = archiveFixedEntry(
      entry,
      { effectiveFrom: currentMonth, hasOperationsInCurrentMonth: false },
      currentMonth,
    );
    expect(result.ok).toBe(true);
    expect(result.ok && result.fixedEntry.archivedFrom).toEqual(currentMonth);
  });

  it("allows the next month regardless of operations", () => {
    const result = archiveFixedEntry(
      entry,
      { effectiveFrom: nextMonth(currentMonth), hasOperationsInCurrentMonth: true },
      currentMonth,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects the current month when operations already exist", () => {
    const result = archiveFixedEntry(
      entry,
      { effectiveFrom: currentMonth, hasOperationsInCurrentMonth: true },
      currentMonth,
    );
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.type).toBe("invalidArchiveDate");
  });
});

describe("unarchiveFixedEntry — R8", () => {
  const currentMonth = parseMonth("2026-03");

  it("allows unarchiving before the archive date takes effect", () => {
    const archived = fixedEntry("a", "Loyer", [], nextMonth(currentMonth));
    const result = unarchiveFixedEntry(archived, currentMonth);
    expect(result.ok).toBe(true);
    expect(result.ok && result.fixedEntry.archivedFrom).toBeUndefined();
  });

  it("rejects when the archive date is the current month", () => {
    const archived = fixedEntry("a", "Loyer", [], currentMonth);
    const result = unarchiveFixedEntry(archived, currentMonth);
    expect(result.ok).toBe(false);
  });

  it("rejects when the archive date is in the past", () => {
    const archived = fixedEntry("a", "Loyer", [], previousMonth(currentMonth));
    const result = unarchiveFixedEntry(archived, currentMonth);
    expect(result.ok).toBe(false);
  });

  it("rejects when the fixed entry isn't archived", () => {
    const notArchived = fixedEntry("a", "Loyer", []);
    const result = unarchiveFixedEntry(notArchived, currentMonth);
    expect(result.ok).toBe(false);
  });
});
