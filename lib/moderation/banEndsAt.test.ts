import { describe, expect, it } from "vitest";
import { computeBanEndsAt } from "./banEndsAt";

describe("computeBanEndsAt", () => {
  it("returns null for permanent (non-positive value)", () => {
    const t = new Date("2026-01-01T12:00:00.000Z");
    expect(computeBanEndsAt(t, "DAYS", 0)).toBeNull();
    expect(computeBanEndsAt(t, "HOURS", -1)).toBeNull();
  });
  it("adds minutes hours days", () => {
    const t = new Date("2026-01-01T12:00:00.000Z");
    expect(computeBanEndsAt(t, "MINUTES", 30)?.toISOString()).toBe("2026-01-01T12:30:00.000Z");
    expect(computeBanEndsAt(t, "HOURS", 2)?.toISOString()).toBe("2026-01-01T14:00:00.000Z");
    expect(computeBanEndsAt(t, "DAYS", 1)?.toISOString()).toBe("2026-01-02T12:00:00.000Z");
  });
});
