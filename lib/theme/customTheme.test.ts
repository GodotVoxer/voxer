import { describe, expect, it } from "vitest";
import { BUILTIN_THEMES, LIGHT_RAMP_STEP_SOURCE } from "./builtinThemes";
import { rampFromColor } from "./colorMath";
import { deriveCustomThemeTokens, findContrastIssues } from "./customTheme";

describe("deriveCustomThemeTokens", () => {
  it.each(["dark", "light"] as const)("is identical to the %s theme without overrides", (base) => {
    expect(deriveCustomThemeTokens(base, {})).toEqual(BUILTIN_THEMES[base].tokens);
  });

  it("uses an overridden neutral as is", () => {
    const tokens = deriveCustomThemeTokens("dark", { "fg-muted": "#abcdef" });
    expect(tokens["fg-muted"]).toBe("#abcdef");
  });

  it("changing a seed re-derives its dependents but keeps overridden ones", () => {
    const tokens = deriveCustomThemeTokens("dark", { fg: "#ffe4b5", "fg-muted": "#123456" });
    expect(tokens["fg-muted"]).toBe("#123456");
    expect(tokens["fg-soft"]).not.toBe(BUILTIN_THEMES.dark.tokens["fg-soft"]);
    expect(tokens["surface-sunken"]).toBe(BUILTIN_THEMES.dark.tokens["surface-sunken"]);
  });

  it("a family color generates its ramp (unmapped in dark)", () => {
    const ramp = rampFromColor("#7c3aed")!;
    const tokens = deriveCustomThemeTokens("dark", { brand: "#7c3aed" });
    expect(tokens["brand-600"]).toBe("#7c3aed");
    expect(tokens["brand-300"]).toBe(ramp[300]);
    expect(tokens.glow).toBe(ramp[400]);
    expect(tokens["danger-600"]).toBe(BUILTIN_THEMES.dark.tokens["danger-600"]);
  });

  it("in light the derived ramp uses the same remapping as the builtin theme", () => {
    const ramp = rampFromColor("#7c3aed")!;
    const tokens = deriveCustomThemeTokens("light", { brand: "#7c3aed" });
    expect(tokens["brand-300"]).toBe(ramp[LIGHT_RAMP_STEP_SOURCE[300]]);
    expect(tokens["brand-600"]).toBe("#7c3aed");
  });

  it("shared colors (labels, avatars) match in dark and light and are overridden as is", () => {
    expect(BUILTIN_THEMES.light.tokens["pill-category"]).toBe(
      BUILTIN_THEMES.dark.tokens["pill-category"],
    );
    const tokens = deriveCustomThemeTokens("light", {
      "pill-category": "#7c3aed",
      "avatar-blue": "#123456",
    });
    expect(tokens["pill-category"]).toBe("#7c3aed");
    expect(tokens["avatar-blue"]).toBe("#123456");
    expect(tokens["pill-replies"]).toBe(BUILTIN_THEMES.light.tokens["pill-replies"]);
  });

  it("changing surfaces or text leaves unrelated tokens alone", () => {
    const tokens = deriveCustomThemeTokens("dark", { surface: "#ffffff", fg: "#000000" });
    expect(tokens.shade).toBe(BUILTIN_THEMES.dark.tokens.shade);
    expect(tokens["on-solid"]).toBe(BUILTIN_THEMES.dark.tokens["on-solid"]);
    expect(tokens["media-placeholder"]).toBe(BUILTIN_THEMES.dark.tokens["media-placeholder"]);
  });
});

describe("findContrastIssues", () => {
  it("builtin themes have no issues", () => {
    expect(findContrastIssues(BUILTIN_THEMES.dark.tokens)).toEqual([]);
    expect(findContrastIssues(BUILTIN_THEMES.light.tokens)).toEqual([]);
  });

  it("detects unreadable text", () => {
    const tokens = deriveCustomThemeTokens("dark", { fg: "#111111" });
    const issues = findContrastIssues(tokens);
    expect(issues.some((i) => i.fg === "fg" && i.bg === "surface")).toBe(true);
    expect(issues.every((i) => i.ratio < i.min)).toBe(true);
  });
});
