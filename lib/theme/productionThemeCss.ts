import { parse } from "postcss";
import { THEME_TOKEN_KEYS } from "@/lib/theme/themeTokens";
import { THEME_CSS_REVISION } from "@/lib/theme/themesCss";

const REQUIRED_UTILITIES = {
  ".bg-pill-category": "--pill-category",
  ".bg-pill-replies": "--pill-replies",
  ".bg-pill-poll": "--pill-poll",
  ".bg-media-chip": "--media-chip",
  ".text-on-media": "--on-media",
};

export const assertProductionThemeCss = (css: string): void => {
  const root = parse(css);
  const declarations = { dark: new Map<string, string>(), light: new Map<string, string>() };
  const utilities = new Set<string>();
  root.walkRules((rule) => {
    for (const selector of rule.selectors) {
      const normalized = selector.replace(/["']/g, "");
      const mode =
        normalized === "[data-theme=light]"
          ? "light"
          : normalized === ":root" || normalized === "[data-theme=dark]"
            ? "dark"
            : null;
      for (const node of rule.nodes) {
        if (node.type !== "decl") continue;
        if (mode) declarations[mode].set(node.prop, node.value);
        const token = REQUIRED_UTILITIES[selector as keyof typeof REQUIRED_UTILITIES];
        if (token && node.value.includes(`var(${token})`)) utilities.add(selector);
      }
    }
  });

  const errors: string[] = [];
  for (const mode of ["dark", "light"] as const) {
    if (
      declarations[mode].get("--voxer-theme-revision")?.replace(/["']/g, "") !== THEME_CSS_REVISION
    ) {
      errors.push(`${mode}: revisión de CSS ausente o desactualizada`);
    }
    for (const key of THEME_TOKEN_KEYS) {
      if (!declarations[mode].get(`--${key}`)?.trim()) errors.push(`${mode}: falta --${key}`);
    }
  }
  for (const selector of Object.keys(REQUIRED_UTILITIES)) {
    if (!utilities.has(selector)) errors.push(`falta utilidad ${selector}`);
  }
  if (errors.length) throw new Error(`Incomplete theme CSS:\n${errors.join("\n")}`);
};
