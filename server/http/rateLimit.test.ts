import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("limits in memory without Upstash", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const key = `mem-${Math.random()}`;
    expect(await rateLimit(key, 2, 60_000)).toBe(true);
    expect(await rateLimit(key, 2, 60_000)).toBe(true);
    expect(await rateLimit(key, 2, 60_000)).toBe(false);
  });

  it("keeps separate keys apart", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    expect(await rateLimit(`a-${Math.random()}`, 1, 60_000)).toBe(true);
    expect(await rateLimit(`b-${Math.random()}`, 1, 60_000)).toBe(true);
  });
});
