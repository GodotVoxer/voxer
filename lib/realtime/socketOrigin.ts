const originOf = (raw: string): string | null => {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
};

/**
 * Whether a room socket handshake may proceed, given the Worker's `ALLOWED_ORIGIN` (comma-separated).
 * Unset means no check. A handshake without `Origin` passes: browsers always send it and a script can
 * forge it, so the check only stops pages of other sites.
 */
export const isAllowedSocketOrigin = (
  origin: string | null,
  allowedOrigins: string | undefined,
): boolean => {
  const allowed = (allowedOrigins ?? "")
    .split(",")
    .map((s) => originOf(s.trim()))
    .filter((s): s is string => s !== null);
  if (allowed.length === 0 || !origin) return true;
  return allowed.includes(origin);
};
