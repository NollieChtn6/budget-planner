import { describe, expect, it } from "vitest";
import { describeAuthError } from "./auth-error-message";

describe("describeAuthError", () => {
  it("translates a known Better Auth code", () => {
    expect(describeAuthError({ code: "INVALID_EMAIL_OR_PASSWORD" }, "x")).toBe(
      "Email ou mot de passe incorrect.",
    );
  });

  it("tells the person to wait when rate limited", () => {
    expect(describeAuthError({ status: 429 }, "x")).toMatch(/Patiente/);
  });

  it("never leaks the English server message for an unknown code", () => {
    expect(
      describeAuthError({ code: "SOMETHING_NEW", message: "Something went wrong" }, "Réessaie."),
    ).toBe("Réessaie.");
  });
});
