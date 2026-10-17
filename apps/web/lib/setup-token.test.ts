import { afterEach, describe, expect, it } from "vitest";
import { isSetupTokenValid } from "./setup-token";

const ORIGINAL_SETUP_TOKEN = process.env.SETUP_TOKEN;

afterEach(() => {
  if (ORIGINAL_SETUP_TOKEN === undefined) {
    delete process.env.SETUP_TOKEN;
  } else {
    process.env.SETUP_TOKEN = ORIGINAL_SETUP_TOKEN;
  }
});

describe("isSetupTokenValid", () => {
  it("accepts the exact configured token", () => {
    process.env.SETUP_TOKEN = "a-very-long-random-token";
    expect(isSetupTokenValid("a-very-long-random-token")).toBe(true);
  });

  it("rejects a wrong token", () => {
    process.env.SETUP_TOKEN = "a-very-long-random-token";
    expect(isSetupTokenValid("something-else")).toBe(false);
  });

  it("rejects a candidate of a different length than the configured token", () => {
    process.env.SETUP_TOKEN = "a-very-long-random-token";
    expect(isSetupTokenValid("short")).toBe(false);
  });

  it("fails closed when SETUP_TOKEN is not configured", () => {
    delete process.env.SETUP_TOKEN;
    expect(isSetupTokenValid("anything")).toBe(false);
  });

  it("rejects a null candidate", () => {
    process.env.SETUP_TOKEN = "a-very-long-random-token";
    expect(isSetupTokenValid(null)).toBe(false);
  });

  it("rejects an empty candidate even if SETUP_TOKEN is empty", () => {
    process.env.SETUP_TOKEN = "";
    expect(isSetupTokenValid("")).toBe(false);
  });
});
