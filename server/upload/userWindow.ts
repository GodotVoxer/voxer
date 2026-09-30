export type UploadSlotDecision =
  | { allowed: true; nextWindowStartMs: number; nextCount: number }
  | { allowed: false; retryAfterMs: number };

/** Decides whether another upload fits and how the window ends up (no I/O). */
export const decideMediaUploadSlot = (
  nowMs: number,
  windowStartMs: number | null,
  countInWindow: number,
  windowDurationMs: number,
  maxPerWindow: number,
): UploadSlotDecision => {
  if (windowStartMs === null || nowMs - windowStartMs >= windowDurationMs) {
    return { allowed: true, nextWindowStartMs: nowMs, nextCount: 1 };
  }
  if (countInWindow >= maxPerWindow) {
    const windowEndMs = windowStartMs + windowDurationMs;
    const retryAfterMs = Math.max(1, windowEndMs - nowMs);
    return { allowed: false, retryAfterMs };
  }
  return { allowed: true, nextWindowStartMs: windowStartMs, nextCount: countInWindow + 1 };
};
