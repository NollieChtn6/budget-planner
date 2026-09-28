import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveAuthRedirect } from "@/lib/auth-redirect";

/**
 * Reachable with no session: /sign-in (nothing yet) and /verify-2fa (a
 * pending 2FA challenge has no Better Auth session either - the two-factor
 * plugin deletes the credential sign-in's session and tracks the challenge
 * through its own short-lived cookie instead).
 */
const PUBLIC_PATHS = new Set(["/sign-in", "/verify-2fa"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });
  const redirectTo = resolveAuthRedirect(session);

  if (redirectTo && redirectTo !== pathname) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
