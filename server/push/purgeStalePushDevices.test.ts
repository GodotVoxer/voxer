import { describe, expect, it } from "vitest";
import { PUSH_DEVICE_STALE_MS } from "@/server/push/constants";
import { stalePushDeviceCutoff } from "@/server/push/purgeStalePushDevices";

describe("stalePushDeviceCutoff", () => {
  it("goes back exactly the abandonment window", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    expect(stalePushDeviceCutoff(now).getTime()).toBe(now.getTime() - PUSH_DEVICE_STALE_MS);
  });

  it("the window is 90 days", () => {
    expect(PUSH_DEVICE_STALE_MS).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it("does not mutate the given date", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    const copy = now.getTime();
    stalePushDeviceCutoff(now);
    expect(now.getTime()).toBe(copy);
  });
});
