import { describe, expect, it } from "vitest";
import type { AvatarVariant } from "@/lib/vox/types";
import { avatarClass, staffBlinkDelaySeconds, stripeColorsForVariant } from "./avatar";
const variants: AvatarVariant[] = [
  "BLUE",
  "GREEN",
  "RED",
  "YELLOW",
  "PINK",
  "BROWN",
  "WHITE",
  "BLACK",
  "MULTICOLOR",
  "MULTICOLOR_INVERTED",
];
describe("avatarClass", () => {
  it("assigns non-empty classes to every known variant", () => {
    for (const v of variants) {
      const c = avatarClass(v);
      expect(c.length).toBeGreaterThan(0);
      if (v === "MULTICOLOR" || v === "MULTICOLOR_INVERTED") {
        expect(c).toContain("text-on-media");
      } else {
        expect(c).toMatch(/^bg-/);
      }
    }
  });
  it("falls back for an unknown value", () => {
    expect(avatarClass("UNKNOWN" as AvatarVariant)).toContain("bg-avatar-gray");
  });
});

describe("stripeColorsForVariant", () => {
  it("inverted stripes keep the order with complementary hues", () => {
    const inverted = stripeColorsForVariant("MULTICOLOR_INVERTED");
    stripeColorsForVariant("MULTICOLOR").forEach((color, i) => {
      expect(inverted[i]).toBe(`hsl(from ${color} calc(h + 180) s l)`);
    });
  });
});

describe("staffBlinkDelaySeconds", () => {
  it("is stable for a seed and stays within the 5s blink cycle", () => {
    const seeds = ["r1", "r2", "r3", "_R_abc_", "x".repeat(200)];
    for (const seed of seeds) {
      const delay = staffBlinkDelaySeconds(seed);
      expect(delay).toBe(staffBlinkDelaySeconds(seed));
      expect(delay).toBeLessThanOrEqual(0);
      expect(delay).toBeGreaterThan(-5);
    }
  });

  it("spreads different avatars apart", () => {
    const delays = new Set(["r1", "r2", "r3", "r4", "r5"].map(staffBlinkDelaySeconds));
    expect(delays.size).toBeGreaterThan(1);
  });
});
