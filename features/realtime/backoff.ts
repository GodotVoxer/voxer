export const RECONNECT_BASE_MS = 500;
export const RECONNECT_MAX_MS = 30_000;

/** Delay before the next reconnect: exponential with a cap, plus jitter so tabs that dropped together do not return together. */
export const nextReconnectDelayMs = (
  attempt: number,
  random: () => number = Math.random,
): number => {
  const safeAttempt = Math.max(0, Math.floor(attempt));
  const exponential = Math.min(RECONNECT_BASE_MS * 2 ** safeAttempt, RECONNECT_MAX_MS);
  const jitter = 0.75 + random() * 0.5; // ±25 %
  return Math.round(exponential * jitter);
};
