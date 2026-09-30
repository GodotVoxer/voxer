import { describe, expect, it } from "vitest";
import { THEME_RAMP_STEPS } from "@/lib/theme/themeTokens";
import { cssColorToHex, mixCssColors, oklabLightness, rampFromColor } from "./colorMath";

describe("cssColorToHex", () => {
  it("normalizes theme formats to #rrggbb", () => {
    expect(cssColorToHex("#FFF")).toBe("#ffffff");
    expect(cssColorToHex("rgb(56 189 248)")).toBe("#38bdf8");
    expect(cssColorToHex("oklch(100% 0 0)")).toBe("#ffffff");
    expect(cssColorToHex("#12345678")).toBe("#123456");
    expect(cssColorToHex("url(x)")).toBeNull();
  });
});

describe("mixCssColors", () => {
  it("respects the endpoints and stays between both colors", () => {
    expect(mixCssColors("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixCssColors("#000000", "#ffffff", 1)).toBe("#ffffff");
    const mid = oklabLightness(mixCssColors("#000000", "#ffffff", 0.5) ?? "") ?? 0;
    expect(mid).toBeGreaterThan(0.45);
    expect(mid).toBeLessThan(0.55);
  });

  it("clamps t outside [0, 1] and rejects invalid colors", () => {
    expect(mixCssColors("#000000", "#ffffff", 5)).toBe("#ffffff");
    expect(mixCssColors("#000000", "nope", 0.5)).toBeNull();
  });
});

describe("rampFromColor", () => {
  it("step 600 is exactly the chosen color", () => {
    expect(rampFromColor("#7c3aed")?.[600]).toBe("#7c3aed");
  });

  it.each(["#7c3aed", "#0ea5e9", "#16a34a", "#111111", "#fafafa", "#ff0000"])(
    "la luminosidad baja paso a paso para %s",
    (color) => {
      const ramp = rampFromColor(color);
      expect(ramp).not.toBeNull();
      const lightness = THEME_RAMP_STEPS.map((step) => oklabLightness(ramp![step]) ?? 0);
      for (let i = 1; i < lightness.length; i++) {
        expect(lightness[i]).toBeLessThanOrEqual(lightness[i - 1] + 1e-6);
      }
    },
  );

  it("every step is a valid hex", () => {
    const ramp = rampFromColor("#e11d48")!;
    for (const step of THEME_RAMP_STEPS) expect(ramp[step]).toMatch(/^#[0-9a-f]{6}$/);
  });
});
