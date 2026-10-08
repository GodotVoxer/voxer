import { describe, expect, it } from "vitest";
import { findContrastIssues } from "./customTheme";
import { customThemeOverridesSchema } from "./customThemeSchema";
import { HALLOWEEN_OVERRIDES, HALLOWEEN_TOKENS } from "./halloweenTheme";
import { SEASONAL_THEME_SURFACE } from "./seasonalTheme";

describe("Halloween theme", () => {
  it("meets the minimum contrast on the real UI pairs", () => {
    expect(findContrastIssues(HALLOWEEN_TOKENS)).toEqual([]);
  });

  it("only uses keys and colors a custom theme could use", () => {
    expect(customThemeOverridesSchema.safeParse(HALLOWEEN_OVERRIDES).success).toBe(true);
  });

  it("paints the browser bar and the Android window with its surface", () => {
    expect(HALLOWEEN_TOKENS.surface).toBe(SEASONAL_THEME_SURFACE);
  });
});
