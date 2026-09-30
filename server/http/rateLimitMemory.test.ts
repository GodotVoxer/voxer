import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimitInMemory, rateLimitMemoryBucketCount } from "./rateLimitMemory";

describe("rateLimitInMemory", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("prunes expired buckets past the threshold instead of growing forever", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    for (let i = 0; i < 5_000; i++) {
      rateLimitInMemory(`prune-${i}`, 1, 1_000);
    }
    expect(rateLimitMemoryBucketCount()).toBeGreaterThanOrEqual(5_000);

    vi.advanceTimersByTime(1_001);
    rateLimitInMemory("prune-trigger", 1, 1_000);

    expect(rateLimitMemoryBucketCount()).toBeLessThan(100);
  });

  it("never exceeds the hard cap even when no bucket has expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));
    for (let i = 0; i < 50_100; i++) {
      rateLimitInMemory(`cap-${i}`, 1, 60_000);
    }
    expect(rateLimitMemoryBucketCount()).toBeLessThanOrEqual(50_000);
  });
});
