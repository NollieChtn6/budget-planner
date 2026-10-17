type AuthRedirectSession = {
  user: {
    twoFactorEnabled?: boolean | null;
  };
} | null;

/**
 * Encodes ADR-0008's access policy: no session means sign in, a session
 * whose TOTP enrollment hasn't happened yet is forced through enrollment
 * before it can reach `(app)`.
 */
export function resolveAuthRedirect(
  session: AuthRedirectSession,
): "/sign-in" | "/enroll-2fa" | null {
  if (!session) return "/sign-in";
  if (!session.user.twoFactorEnabled) return "/enroll-2fa";
  return null;
}
