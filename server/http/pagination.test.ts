import { describe, expect, it } from "vitest";
import { clampPageLimit } from "./pagination";

describe("clampPageLimit", () => {
  it("keeps the request within 1..max and falls back when absent", () => {
    expect(clampPageLimit(undefined, { max: 50, fallback: 24 })).toBe(24);
    expect(clampPageLimit(0, { max: 50, fallback: 24 })).toBe(1);
    expect(clampPageLimit(500, { max: 50, fallback: 24 })).toBe(50);
    expect(clampPageLimit(7.9, { max: 50, fallback: 24 })).toBe(7);
  });
});
