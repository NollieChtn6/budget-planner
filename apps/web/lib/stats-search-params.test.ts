import { describe, expect, it } from "vitest";
import { parseStatsPeriod, statsPeriodHref } from "./stats-search-params";

describe("parseStatsPeriod", () => {
  it("defaults to the last 6 months, active month included", () => {
    expect(parseStatsPeriod({})).toEqual({ length: 6, includeActiveMonth: true });
  });

  it("reads a valid length and the active month toggle", () => {
    expect(parseStatsPeriod({ period: "12", active: "0" })).toEqual({
      length: 12,
      includeActiveMonth: false,
    });
    expect(parseStatsPeriod({ period: "all" })).toEqual({
      length: "all",
      includeActiveMonth: true,
    });
  });

  it("falls back to the default on an unexpected length", () => {
    expect(parseStatsPeriod({ period: "7" }).length).toBe(6);
    expect(parseStatsPeriod({ period: "-1" }).length).toBe(6);
  });
});

describe("statsPeriodHref", () => {
  it("round-trips through parseStatsPeriod", () => {
    const period = { length: 3, includeActiveMonth: false } as const;
    const query = Object.fromEntries(new URL(statsPeriodHref(period), "http://x").searchParams);
    expect(parseStatsPeriod(query)).toEqual(period);
  });
});
