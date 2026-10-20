import { parseMonth } from "@budget/domain";
import { describe, expect, it } from "vitest";
import { describeTimeline, monthsUntil } from "./provision-timeline";

const month = parseMonth;

describe("monthsUntil", () => {
  it("counts whole months across a year change", () => {
    expect(monthsUntil(month("2026-10"), month("2027-06"))).toBe(8);
  });

  it("is negative when the target month is earlier", () => {
    expect(monthsUntil(month("2026-10"), month("2026-08"))).toBe(-2);
  });
});

describe("describeTimeline", () => {
  it("counts the due month as a month left", () => {
    expect(describeTimeline(month("2026-10"), month("2027-06"))).toBe("9 mois restants");
  });

  it("says when the active month is the last one", () => {
    expect(describeTimeline(month("2027-06"), month("2027-06"))).toBe("dernier mois pour verser");
  });

  it("says when the due month is over", () => {
    expect(describeTimeline(month("2026-10"), month("2026-08"))).toBe(
      "échéance dépassée depuis 2 mois",
    );
  });
});
