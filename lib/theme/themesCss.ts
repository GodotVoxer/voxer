import { createHash } from "node:crypto";
import { BUILTIN_THEMES, type BuiltinTheme } from "@/lib/theme/builtinThemes";
import { HALLOWEEN_TOKENS } from "@/lib/theme/halloweenTheme";
import { SEASONAL_THEME_NAME } from "@/lib/theme/seasonalTheme";
import { THEME_TOKEN_KEYS } from "@/lib/theme/themeTokens";

export const GLOBALS_CSS_PATH = "app/globals.css";
const THEME_TOKENS_START_MARKER = "/* @generated theme-tokens:start */";
export const THEME_TOKENS_END_MARKER = "/* @generated theme-tokens:end */";
export const THEME_CSS_REVISION = createHash("sha256")
  .update(JSON.stringify(BUILTIN_THEMES))
  .digest("hex")
  .slice(0, 16);

const HEADER = [
  "/*",
  " * GENERATED from lib/theme/builtinThemes.ts by `npm run theme:css`: do not edit by hand",
  " * (lib/theme/builtinThemes.test.ts fails if it differs). It lives inside app/globals.css on purpose:",
  " * a relative CSS `@import` was dropped from production builds and left the app without tokens.",
  " * Product classes use ONLY these tokens (bg-surface-raised, text-fg-muted, border-fg/10, text-brand-300...),",
  " * never the raw Tailwind palette (enforced by tests/policy/themeTokenUsage.test.ts).",
  " */",
];

const themeBlock = (selectors: string[], theme: BuiltinTheme): string[] => [
  `${selectors.join(",\n")} {`,
  `  color-scheme: ${theme.colorScheme};`,
  `  --voxer-theme-revision: "${THEME_CSS_REVISION}";`,
  ...THEME_TOKEN_KEYS.map((key) => `  --${key}: ${theme.tokens[key]};`),
  `  --data-hue-text-l: ${theme.dataHueTextL};`,
  "}",
];

export const buildThemesCss = (): string =>
  [
    ...HEADER,
    ...themeBlock([":root", '[data-theme="dark"]'], BUILTIN_THEMES.dark),
    "",
    ...themeBlock(['[data-theme="light"]'], BUILTIN_THEMES.light),
    "",
    // `:root` raises specificity over the dark block; subtrees with their own `data-theme` (the theme editor) keep their base.
    ...themeBlock([`:root[data-seasonal-theme="${SEASONAL_THEME_NAME}"]`], {
      ...BUILTIN_THEMES.dark,
      tokens: HALLOWEEN_TOKENS,
    }),
    "",
    "@theme inline {",
    ...THEME_TOKEN_KEYS.map((key) => `  --color-${key}: var(--${key});`),
    "}",
    "",
  ].join("\n");

const markerBounds = (globalsCss: string): { contentStart: number; contentEnd: number } => {
  const start = globalsCss.indexOf(THEME_TOKENS_START_MARKER);
  const end = globalsCss.indexOf(THEME_TOKENS_END_MARKER);
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Theme token markers missing in ${GLOBALS_CSS_PATH}`);
  }
  return { contentStart: start + THEME_TOKENS_START_MARKER.length, contentEnd: end };
};

/** Replaces the content between the markers in `app/globals.css` with the generated block. */
export const withGeneratedThemesCss = (globalsCss: string): string => {
  const { contentStart, contentEnd } = markerBounds(globalsCss);
  return `${globalsCss.slice(0, contentStart)}\n${buildThemesCss()}${globalsCss.slice(contentEnd)}`;
};

export const extractGeneratedThemesCss = (globalsCss: string): string => {
  const { contentStart, contentEnd } = markerBounds(globalsCss);
  return globalsCss.slice(contentStart, contentEnd).replace(/^\n/, "");
};
