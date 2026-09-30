import { describe, expect, it } from "vitest";
import { SESSION_TTL_SEC } from "@/lib/auth/constants";
import {
  SESSION_REFRESH_THRESHOLD_SEC,
  shouldRefreshSessionCookie,
} from "@/lib/auth/slidingSession";

const NOW = 1_800_000_000;

describe("shouldRefreshSessionCookie", () => {
  it("the threshold is half the TTL", () => {
    expect(SESSION_REFRESH_THRESHOLD_SEC).toBe(Math.floor(SESSION_TTL_SEC / 2));
  });

  it("does not renew a freshly issued cookie", () => {
    expect(shouldRefreshSessionCookie(NOW + SESSION_TTL_SEC, NOW)).toBe(false);
  });

  it("renews past half the TTL", () => {
    expect(shouldRefreshSessionCookie(NOW + SESSION_REFRESH_THRESHOLD_SEC - 1, NOW)).toBe(true);
  });

  it("renews at the exact boundary", () => {
    expect(shouldRefreshSessionCookie(NOW + SESSION_REFRESH_THRESHOLD_SEC, NOW)).toBe(true);
    expect(shouldRefreshSessionCookie(NOW + SESSION_REFRESH_THRESHOLD_SEC + 1, NOW)).toBe(false);
  });

  it("does not renew an expired token or one expiring right now", () => {
    expect(shouldRefreshSessionCookie(NOW, NOW)).toBe(false);
    expect(shouldRefreshSessionCookie(NOW - 1, NOW)).toBe(false);
  });

  it("survives non-finite values", () => {
    expect(shouldRefreshSessionCookie(Number.NaN, NOW)).toBe(false);
    expect(shouldRefreshSessionCookie(Number.POSITIVE_INFINITY, NOW)).toBe(false);
  });
});
