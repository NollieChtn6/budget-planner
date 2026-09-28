import { describe, expect, it } from "vitest";
import { resolveAuthRedirect } from "./auth-redirect";

describe("resolveAuthRedirect", () => {
  it("redirects to /sign-in when there is no session", () => {
    expect(resolveAuthRedirect(null)).toBe("/sign-in");
  });

  it("redirects to /enroll-2fa when the session's user has not enrolled TOTP", () => {
    const session = { user: { twoFactorEnabled: false } };
    expect(resolveAuthRedirect(session)).toBe("/enroll-2fa");
  });

  it("redirects to /enroll-2fa when twoFactorEnabled is null", () => {
    const session = { user: { twoFactorEnabled: null } };
    expect(resolveAuthRedirect(session)).toBe("/enroll-2fa");
  });

  it("passes through when the session's user has enrolled TOTP", () => {
    const session = { user: { twoFactorEnabled: true } };
    expect(resolveAuthRedirect(session)).toBeNull();
  });
});
