import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUILTIN_THEMES } from "./builtinThemes";
import { contrastRatio, parseColorToLinearRgb } from "./colorContrast";
import {
  buildThemesCss,
  extractGeneratedThemesCss,
  GLOBALS_CSS_PATH,
  withGeneratedThemesCss,
} from "./themesCss";
import { CONTRAST_PAIRS, THEME_TOKEN_KEYS } from "./themeTokens";

const themes = Object.values(BUILTIN_THEMES);
const globalsCss = () => readFileSync(path.resolve(__dirname, "../..", GLOBALS_CSS_PATH), "utf8");

describe("builtin themes", () => {
  it("the token block in app/globals.css is up to date (regenerate with npm run theme:css)", () => {
    expect(extractGeneratedThemesCss(globalsCss())).toBe(buildThemesCss());
  });

  it("tokens live in globals.css and do not depend on a relative CSS @import", () => {
    expect(globalsCss()).not.toMatch(/@import\s+["']\.{1,2}\//);
  });

  it("regenerating is idempotent and keeps what is outside the markers", () => {
    const css = globalsCss();
    expect(withGeneratedThemesCss(css)).toBe(css);
    expect(() => withGeneratedThemesCss("body {}")).toThrow("Theme token markers missing");
  });

  it.each(themes)("$id defines every token with measurable colors", (theme) => {
    const invalid = THEME_TOKEN_KEYS.filter(
      (key) => !parseColorToLinearRgb(theme.tokens[key] ?? ""),
    );
    expect(invalid).toEqual([]);
  });

  it.each(themes)("$id meets the minimum contrast on the real UI pairs", (theme) => {
    const failures = CONTRAST_PAIRS.flatMap(({ fg, bg, min }) => {
      const ratio = contrastRatio(theme.tokens[fg], theme.tokens[bg]);
      return ratio < min ? [`${fg} sobre ${bg}: ${ratio.toFixed(2)} < ${min}`] : [];
    });
    expect(failures).toEqual([]);
  });
});
