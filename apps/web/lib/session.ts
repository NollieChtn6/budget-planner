import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { resolveAuthRedirect } from "./auth-redirect";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Re-verifies the session in each Server Action / protected page, on top of
 * the middleware gate (ADR-0008: the middleware is never the only check).
 */
export async function requireSession() {
  const session = await getSession();
  const redirectTo = resolveAuthRedirect(session);
  if (redirectTo) {
    redirect(redirectTo);
  }
  if (!session) {
    throw new Error("Unreachable: resolveAuthRedirect should have redirected.");
  }
  return session;
}
