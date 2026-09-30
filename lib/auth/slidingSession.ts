import { SESSION_TTL_SEC } from "@/lib/auth/constants";

/** The cookie is reissued once less than half of its TTL is left. */
export const SESSION_REFRESH_THRESHOLD_SEC = Math.floor(SESSION_TTL_SEC / 2);

/**
 * Keeps active users signed in: `/api/auth/me` runs on every return to the foreground, so anyone who
 * opens the app at least every 3.5 days never expires. `sessionVersion` is untouched, so a global
 * logout still ends every session.
 */
export const shouldRefreshSessionCookie = (expiresAtSec: number, nowSec: number): boolean => {
  if (!Number.isFinite(expiresAtSec)) return false;
  // Unreachable in practice: `jwtVerify` already rejects expired tokens.
  if (expiresAtSec <= nowSec) return false;
  return expiresAtSec - nowSec <= SESSION_REFRESH_THRESHOLD_SEC;
};
