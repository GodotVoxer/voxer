import { BUILTIN_THEMES, type BuiltinThemeId } from "@/lib/theme/builtinThemes";
import { deriveCustomThemeTokens, type CustomThemeOverrides } from "@/lib/theme/customTheme";
import { THEME_TOKEN_KEYS } from "@/lib/theme/themeTokens";

/**
 * CSS variables (without `--`) a custom theme changes from its base. All hex, so they pass the local
 * cache and inline script validation. Separate module so it only loads with a custom theme.
 */
export const customThemeCssVariables = (
  base: BuiltinThemeId,
  overrides: CustomThemeOverrides,
): Record<string, string> => {
  const derived = deriveCustomThemeTokens(base, overrides);
  const builtin = BUILTIN_THEMES[base].tokens;
  return Object.fromEntries(
    THEME_TOKEN_KEYS.filter((key) => derived[key] !== builtin[key]).map((key) => [
      key,
      derived[key],
    ]),
  );
};
