import { describe, expect, it } from "vitest";
import { contrastRatio, parseColorToLinearRgb } from "./colorContrast";

describe("contrastRatio", () => {
  it("black on white is 21:1 and symmetric", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
  });

  it("matches WCAG reference values", () => {
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("rgb(0 0 255)", "#fff")).toBeCloseTo(8.59, 2);
  });

  it("oklch at the extremes equals white and black", () => {
    expect(contrastRatio("oklch(100% 0 0)", "oklch(0% 0 0)")).toBeCloseTo(21, 1);
    expect(contrastRatio("oklch(1 0 0)", "#000")).toBeCloseTo(21, 1);
  });

  it("throws for colors it cannot measure", () => {
    expect(() => contrastRatio("red", "#fff")).toThrow("Unsupported color: red");
  });
});

describe("parseColorToLinearRgb", () => {
  it.each([
    "#abc",
    "#aabbcc",
    "#aabbccdd",
    "rgb(56 189 248)",
    "rgb(56, 189, 248)",
    "oklch(58.8% 0.158 241.966)",
  ])("acepta %s", (color) => {
    expect(parseColorToLinearRgb(color)).not.toBeNull();
  });

  it.each(["", "red", "#ggg", "rgb(300 0 0)", "hsl(0 0% 0%)", "var(--fg)", "url(x)"])(
    "rechaza %s",
    (color) => {
      expect(parseColorToLinearRgb(color)).toBeNull();
    },
  );
});
