import { describe, expect, it } from "vitest";
import {
  nextReconnectDelayMs,
  RECONNECT_BASE_MS,
  RECONNECT_MAX_MS,
} from "@/features/realtime/backoff";

describe("nextReconnectDelayMs", () => {
  it("grows exponentially from the base", () => {
    const mid = () => 0.5; // jitter neutro
    expect(nextReconnectDelayMs(0, mid)).toBe(RECONNECT_BASE_MS);
    expect(nextReconnectDelayMs(1, mid)).toBe(RECONNECT_BASE_MS * 2);
    expect(nextReconnectDelayMs(3, mid)).toBe(RECONNECT_BASE_MS * 8);
  });

  it("stays below the cap", () => {
    expect(nextReconnectDelayMs(50, () => 0.5)).toBe(RECONNECT_MAX_MS);
    expect(nextReconnectDelayMs(50, () => 1)).toBeLessThanOrEqual(RECONNECT_MAX_MS * 1.25);
  });

  it("applies 25% jitter", () => {
    expect(nextReconnectDelayMs(2, () => 0)).toBe(Math.round(RECONNECT_BASE_MS * 4 * 0.75));
    expect(nextReconnectDelayMs(2, () => 1)).toBe(Math.round(RECONNECT_BASE_MS * 4 * 1.25));
  });

  it("tolerates negative or fractional attempts", () => {
    expect(nextReconnectDelayMs(-5, () => 0.5)).toBe(RECONNECT_BASE_MS);
    expect(nextReconnectDelayMs(1.9, () => 0.5)).toBe(RECONNECT_BASE_MS * 2);
  });
});
