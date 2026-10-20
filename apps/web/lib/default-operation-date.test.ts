import { describe, expect, it } from "vitest";
import { defaultOperationDate } from "./default-operation-date";

const MIN = "2026-10-01";
const MAX = "2026-10-31";

describe("defaultOperationDate", () => {
  it("is today when it falls in the month", () => {
    expect(defaultOperationDate(MIN, MAX, new Date(2026, 9, 20, 12))).toBe("2026-10-20");
  });

  it("uses the local day late in the evening, not the UTC one", () => {
    expect(defaultOperationDate(MIN, MAX, new Date(2026, 9, 20, 23, 59))).toBe("2026-10-20");
  });

  it("is the last day of the month once the month is over", () => {
    expect(defaultOperationDate(MIN, MAX, new Date(2026, 10, 3, 9))).toBe(MAX);
  });

  it("is the first day of the month when the month has not started", () => {
    expect(defaultOperationDate(MIN, MAX, new Date(2026, 8, 28, 9))).toBe(MIN);
  });
});
