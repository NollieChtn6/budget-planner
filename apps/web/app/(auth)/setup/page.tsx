import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasAnyUser } from "@/lib/create-user";
import { isSetupTokenValid } from "@/lib/setup-token";
import { SetupForm } from "./setup-form";

/**
 * Provisions the single account for hosts without shell access (ADR-0008).
 * 404s rather than showing a distinct "invalid token" or "already set up"
 * error, so the route's existence isn't confirmed to a visitor without the
 * token.
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!isSetupTokenValid(token ?? null) || (await hasAnyUser(auth))) {
    notFound();
  }

  return <SetupForm token={token ?? ""} />;
}
