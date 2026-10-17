import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

/**
 * Fail-closed (ADR-0008): no `SETUP_TOKEN` configured means `/setup` never
 * accepts any candidate, rather than falling back to "no protection".
 * Comparing digests (fixed-length) rather than the raw strings keeps the
 * check constant-time without leaking the token's length.
 */
export function isSetupTokenValid(candidate: string | null): boolean {
  const expected = process.env.SETUP_TOKEN;
  if (!expected || !candidate) return false;
  return timingSafeEqual(digest(candidate), digest(expected));
}
