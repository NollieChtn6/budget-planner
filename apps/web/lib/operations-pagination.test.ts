import { describe, expect, it } from "vitest";
import { clampPage, DEFAULT_PAGE_SIZE, parsePageSize } from "./operations-pagination";

describe("parsePageSize", () => {
  it("accepts an offered size", () => {
    expect(parsePageSize("50")).toBe(50);
  });

  it("falls back to the default for anything else", () => {
    expect(parsePageSize(undefined)).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("7")).toBe(DEFAULT_PAGE_SIZE);
    expect(parsePageSize("abc")).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe("clampPage", () => {
  it("keeps a valid page", () => {
    expect(clampPage("2", 60, 25)).toBe(2);
  });

  it("clamps into the available pages", () => {
    expect(clampPage("9", 60, 25)).toBe(3);
    expect(clampPage("0", 60, 25)).toBe(1);
    expect(clampPage("-3", 60, 25)).toBe(1);
    expect(clampPage("abc", 60, 25)).toBe(1);
    expect(clampPage(undefined, 60, 25)).toBe(1);
  });

  it("has one page when empty", () => {
    expect(clampPage("4", 0, 25)).toBe(1);
  });
});
