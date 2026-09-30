import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = () => ({});
    limit = async () => {
      throw new Error("upstash down");
    };
  }
  return { Ratelimit };
});

describe("rateLimit with Upstash down", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not throw and falls back to memory", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { rateLimit } = await import("./rateLimit");
    const key = `fallback-${Math.random()}`;
    expect(await rateLimit(key, 1, 60_000)).toBe(true);
    expect(await rateLimit(key, 1, 60_000)).toBe(false);
  });
});
