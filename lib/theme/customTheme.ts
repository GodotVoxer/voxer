import {
  BUILTIN_THEMES,
  LIGHT_RAMP_STEP_SOURCE,
  type BuiltinThemeId,
} from "@/lib/theme/builtinThemes";
import { contrastRatio } from "@/lib/theme/colorContrast";
import { mixCssColors, rampFromColor } from "@/lib/theme/colorMath";
import {
  CONTRAST_PAIRS,
  THEME_RAMP_FAMILIES,
  THEME_RAMP_STEPS,
  THEME_SHARED_TOKEN_KEYS,
  type ContrastPair,
  type ThemeNeutralTokenKey,
  type ThemeRampFamily,
  type ThemeTokenMap,
} from "@/lib/theme/themeTokens";

export const CUSTOM_THEME_NAME_MAX = 40;
export const CUSTOM_THEMES_PER_USER_MAX = 10;
export const GRADIENT_STOPS_MIN = 2;
export const GRADIENT_STOPS_MAX = 4;
export const HEADER_GRADIENT_STOPS_MAX = 10;
export const VOX_BACKGROUND_DIM_MAX = 85;
export const THEME_BACKGROUND_FITS = ["cover", "contain", "tile"] as const;
/** The only color format custom themes accept: no `url()`, `var()` or CSS functions. */
export const HEX_COLOR_RE = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;
export const THEME_ID_RE = /^[a-z0-9]{1,64}$/;
export const THEME_ASSET_SHARE_ID_RE = /^[A-Za-z0-9_-]{32}$/;

export const CUSTOM_THEME_BASES = ["dark", "light"] as const satisfies readonly BuiltinThemeId[];

/** Neutrals users can override; glows (`glow*`, `pinned-glow*`) derive from the accent and warning colors. */
const CUSTOM_THEME_NEUTRAL_KEYS = [
  "surface",
  "surface-sunken",
  "surface-raised",
  "surface-muted",
  "surface-elevated",
  "surface-strong",
  "surface-vox-detail",
  "surface-toolbar",
  "media-placeholder",
  "shade",
  "comment-pin",
  "comment-pin-soft",
  "on-solid",
  "fg",
  "fg-bright",
  "fg-soft",
  "fg-secondary",
  "fg-muted",
  "fg-subtle",
  "fg-faint",
  "greentext",
  "header-scrim",
  "header-fg",
  "header-text-bg",
  "header-control",
  "header-control-border",
  "sidebar-bg",
  "sidebar-fg",
  "sidebar-muted",
  "sidebar-accent",
  "sidebar-accent-fg",
] as const satisfies readonly ThemeNeutralTokenKey[];

/** Neutrals and shared tokens apply as is; family colors generate their ramp. */
const CUSTOM_THEME_DIRECT_KEYS = [
  ...CUSTOM_THEME_NEUTRAL_KEYS,
  ...THEME_SHARED_TOKEN_KEYS,
] as const;

export const CUSTOM_THEME_OVERRIDE_KEYS = [
  ...CUSTOM_THEME_DIRECT_KEYS,
  ...THEME_RAMP_FAMILIES,
] as const;

type CustomThemeNeutralKey = (typeof CUSTOM_THEME_NEUTRAL_KEYS)[number];
export type CustomThemeOverrideKey = (typeof CUSTOM_THEME_OVERRIDE_KEYS)[number];
export type CustomThemeOverrides = Partial<Record<CustomThemeOverrideKey, string>>;

/** Seeds of the Basic mode; the other neutrals derive from them unless overridden. */
export const CUSTOM_THEME_BASIC_KEYS = [
  "surface",
  "surface-raised",
  "surface-vox-detail",
  "fg",
  "brand",
  "danger",
] as const satisfies readonly CustomThemeOverrideKey[];

type GradientStop = { color: string; pos: number };
export type ThemeGradient = {
  kind: "gradient";
  type: "linear" | "radial";
  angleDeg: number;
  stops: GradientStop[];
};
export type HeaderBackground = { kind: "none" } | { kind: "solid"; color: string } | ThemeGradient;
export type ThemeBackgroundFit = (typeof THEME_BACKGROUND_FITS)[number];
export type VoxBackground =
  | { kind: "none" }
  | { kind: "solid"; color: string }
  | ThemeGradient
  | {
      /** Only the id: the server resolves URLs from its own keys, never from the client. */
      kind: "image";
      assetId: string;
      fit: ThemeBackgroundFit;
      /** Veil of the vox background color over the image, for readability (0-85%). */
      dimPct: number;
    };

export type CustomThemeInput = {
  name: string;
  base: BuiltinThemeId;
  overrides: CustomThemeOverrides;
  headerBackground: HeaderBackground;
  voxBackground: VoxBackground;
};

/** Server-resolved URLs for `voxBackground.kind === "image"` (null when the image is gone). */
export type ThemeBackgroundImageRef = { assetId: string; url: string; urlSm: string };

export type CustomThemeDto = CustomThemeInput & {
  id: string;
  version: number;
  updatedAt: string;
  backgroundImage?: ThemeBackgroundImageRef | null;
};

export type ThemeAssetDto = {
  id: string;
  url: string;
  urlSm: string;
  width: number;
  height: number;
  byteSize: number;
  createdAt: string;
};

export type ThemeAssetQuota = {
  count: number;
  maxCount: number;
  bytes: number;
  maxBytes: number;
};

type DerivedNeutral = {
  from: CustomThemeNeutralKey;
  to: CustomThemeNeutralKey;
  t: Record<BuiltinThemeId, number>;
};

/** Dependent neutrals: OKLab mix between two seeds, tuned to how the builtin themes look. */
const DERIVED_NEUTRALS: Partial<Record<CustomThemeNeutralKey, DerivedNeutral>> = {
  "surface-sunken": { from: "surface", to: "surface-raised", t: { dark: 0, light: 0.5 } },
  "surface-muted": { from: "surface", to: "fg", t: { dark: 0.06, light: 0.06 } },
  "surface-elevated": { from: "surface-raised", to: "fg", t: { dark: 0.08, light: 0.03 } },
  "surface-strong": { from: "surface-raised", to: "fg", t: { dark: 0.2, light: 0.15 } },
  "surface-toolbar": { from: "surface-vox-detail", to: "fg", t: { dark: 0.04, light: 0.06 } },
  "fg-bright": { from: "fg", to: "surface-raised", t: { dark: 0.03, light: 0.03 } },
  "fg-soft": { from: "fg", to: "surface-raised", t: { dark: 0.08, light: 0.08 } },
  "fg-secondary": { from: "fg", to: "surface-raised", t: { dark: 0.14, light: 0.14 } },
  "fg-muted": { from: "fg", to: "surface-raised", t: { dark: 0.35, light: 0.3 } },
  "fg-subtle": { from: "fg", to: "surface-raised", t: { dark: 0.52, light: 0.45 } },
  "fg-faint": { from: "fg", to: "surface-raised", t: { dark: 0.66, light: 0.62 } },
  "header-fg": { from: "fg", to: "surface-raised", t: { dark: 0.03, light: 0.03 } },
  "header-text-bg": {
    from: "surface-sunken",
    to: "surface-raised",
    t: { dark: 0.15, light: 0.15 },
  },
  "header-control": {
    from: "surface-raised",
    to: "surface-elevated",
    t: { dark: 0.2, light: 0.2 },
  },
  "header-control-border": {
    from: "surface-strong",
    to: "fg",
    t: { dark: 0.12, light: 0.08 },
  },
  "sidebar-bg": {
    from: "surface-raised",
    to: "surface",
    t: { dark: 0.12, light: 0.12 },
  },
  "sidebar-fg": { from: "fg", to: "surface-raised", t: { dark: 0.02, light: 0.02 } },
  "sidebar-muted": { from: "fg", to: "surface-raised", t: { dark: 0.35, light: 0.32 } },
};

const isRampFamily = (key: string): key is ThemeRampFamily =>
  (THEME_RAMP_FAMILIES as readonly string[]).includes(key);

/**
 * Full tokens of a custom theme. Without overrides it is exactly the base theme; with overrides,
 * neutrals depending on a changed seed are re-derived (unless overridden too) and each family color
 * generates its ramp, remapped in light mode like the builtin theme.
 */
export const deriveCustomThemeTokens = (
  base: BuiltinThemeId,
  overrides: CustomThemeOverrides,
): ThemeTokenMap => {
  const tokens: ThemeTokenMap = { ...BUILTIN_THEMES[base].tokens };
  const isSet = (key: CustomThemeOverrideKey) => typeof overrides[key] === "string";

  for (const key of CUSTOM_THEME_DIRECT_KEYS) {
    const value = overrides[key];
    if (value) tokens[key] = value;
  }

  for (const [key, rule] of Object.entries(DERIVED_NEUTRALS) as [
    CustomThemeNeutralKey,
    DerivedNeutral,
  ][]) {
    if (isSet(key) || (!isSet(rule.from) && !isSet(rule.to))) continue;
    const mixed = mixCssColors(tokens[rule.from], tokens[rule.to], rule.t[base]);
    if (mixed) tokens[key] = mixed;
  }

  for (const family of THEME_RAMP_FAMILIES) {
    const value = overrides[family];
    if (!value || !isRampFamily(family)) continue;
    const ramp = rampFromColor(value);
    if (!ramp) continue;
    for (const step of THEME_RAMP_STEPS) {
      tokens[`${family}-${step}`] = ramp[base === "light" ? LIGHT_RAMP_STEP_SOURCE[step] : step];
    }
    if (family === "brand") {
      tokens.glow = ramp[400];
      tokens["glow-deep"] = ramp[500];
    }
    if (family === "warning") {
      tokens["pinned-glow"] = ramp[500];
      tokens["pinned-glow-soft"] = ramp[400];
    }
  }

  return tokens;
};

export type ContrastIssue = ContrastPair & { ratio: number };

export const findContrastIssues = (tokens: ThemeTokenMap): ContrastIssue[] =>
  CONTRAST_PAIRS.flatMap((pair) => {
    const ratio = contrastRatio(tokens[pair.fg], tokens[pair.bg]);
    return ratio < pair.min ? [{ ...pair, ratio }] : [];
  });

export const DEFAULT_VOX_BACKGROUND: VoxBackground = { kind: "none" };
export const DEFAULT_HEADER_BACKGROUND: HeaderBackground = { kind: "none" };
