import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CUSTOM_THEME_OVERRIDE_KEYS } from "./customTheme";
import { customThemeCssVariables } from "./customThemeVariables";
import { isValidCustomThemeVars } from "./themePreference";

describe("customThemeCssVariables", () => {
  it("changes nothing without overrides", () => {
    expect(customThemeCssVariables("dark", {})).toEqual({});
    expect(customThemeCssVariables("light", {})).toEqual({});
  });

  it("includes only what differs from the base", () => {
    const vars = customThemeCssVariables("dark", { "fg-muted": "#abcdef" });
    expect(vars).toEqual({ "fg-muted": "#abcdef" });
  });

  it("with arbitrary valid overrides the result always passes the cache validation", () => {
    const hex = fc.stringMatching(/^#[0-9a-f]{6}$/);
    const overrides = fc.dictionary(fc.constantFrom(...CUSTOM_THEME_OVERRIDE_KEYS), hex);
    fc.assert(
      fc.property(
        fc.constantFrom("dark", "light") as fc.Arbitrary<"dark" | "light">,
        overrides,
        (base, o) => isValidCustomThemeVars(customThemeCssVariables(base, o)),
      ),
      { numRuns: 300 },
    );
  });
});
