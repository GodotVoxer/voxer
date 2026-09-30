import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimit = vi.fn<(key: string, limit: number, windowMs: number) => Promise<boolean>>();
vi.mock("@/server/http/rateLimit", () => ({ rateLimit }));

const { userActionRateLimitResponse } = await import("./userActionRateLimit");

describe("userActionRateLimitResponse", () => {
  beforeEach(() => rateLimit.mockReset());

  it("allows requests within the quota, keyed by action and user", async () => {
    rateLimit.mockResolvedValue(true);
    expect(await userActionRateLimitResponse("u1", "pollVote")).toBeNull();
    expect(rateLimit).toHaveBeenCalledWith("user-action:pollVote:u1", 20, 60_000);
  });

  it("answers 429 past the quota", async () => {
    rateLimit.mockResolvedValue(false);
    const res = await userActionRateLimitResponse("u1", "voxFlags");
    expect(res?.status).toBe(429);
    expect(await res?.json()).toEqual({ error: expect.stringContaining("Demasiadas") });
  });
});
