import {
  THEME_RAMP_FAMILIES,
  THEME_RAMP_STEPS,
  type ThemeNeutralTokenKey,
  type ThemeRampFamily,
  type ThemeRampStep,
  type ThemeSharedTokenKey,
  type ThemeTokenMap,
} from "@/lib/theme/themeTokens";

type Ramp = Record<ThemeRampStep, string>;

/** Tailwind 4.3 palette (sky, red, amber, ...), which keeps the dark theme identical to the original UI. */
const TAILWIND_RAMPS: Record<ThemeRampFamily, Ramp> = {
  brand: {
    100: "oklch(95.1% 0.026 236.824)",
    200: "oklch(90.1% 0.058 230.902)",
    300: "oklch(82.8% 0.111 230.318)",
    400: "oklch(74.6% 0.16 232.661)",
    500: "oklch(68.5% 0.169 237.323)",
    // Darker than Tailwind sky-600 so white text on solid buttons reaches 4.5:1.
    600: "oklch(55% 0.158 241.966)",
    700: "oklch(50% 0.134 242.749)",
    800: "oklch(44.3% 0.11 240.79)",
    900: "oklch(39.1% 0.09 240.876)",
    950: "oklch(29.3% 0.066 243.157)",
  },
  danger: {
    100: "oklch(93.6% 0.032 17.717)",
    200: "oklch(88.5% 0.062 18.334)",
    300: "oklch(80.8% 0.114 19.571)",
    400: "oklch(70.4% 0.191 22.216)",
    500: "oklch(63.7% 0.237 25.331)",
    600: "oklch(57.7% 0.245 27.325)",
    700: "oklch(50.5% 0.213 27.518)",
    800: "oklch(44.4% 0.177 26.899)",
    900: "oklch(39.6% 0.141 25.723)",
    950: "oklch(25.8% 0.092 26.042)",
  },
  warning: {
    100: "oklch(96.2% 0.059 95.617)",
    200: "oklch(92.4% 0.12 95.746)",
    300: "oklch(87.9% 0.169 91.605)",
    400: "oklch(82.8% 0.189 84.429)",
    500: "oklch(76.9% 0.188 70.08)",
    600: "oklch(66.6% 0.179 58.318)",
    700: "oklch(55.5% 0.163 48.998)",
    800: "oklch(47.3% 0.137 46.201)",
    900: "oklch(41.4% 0.112 45.904)",
    950: "oklch(27.9% 0.077 45.635)",
  },
  caution: {
    100: "oklch(95.4% 0.038 75.164)",
    200: "oklch(90.1% 0.076 70.697)",
    300: "oklch(83.7% 0.128 66.29)",
    400: "oklch(75% 0.183 55.934)",
    500: "oklch(70.5% 0.213 47.604)",
    600: "oklch(64.6% 0.222 41.116)",
    700: "oklch(55.3% 0.195 38.402)",
    800: "oklch(47% 0.157 37.304)",
    900: "oklch(40.8% 0.123 38.172)",
    950: "oklch(26.6% 0.079 36.259)",
  },
  success: {
    100: "oklch(95% 0.052 163.051)",
    200: "oklch(90.5% 0.093 164.15)",
    300: "oklch(84.5% 0.143 164.978)",
    400: "oklch(76.5% 0.177 163.223)",
    500: "oklch(69.6% 0.17 162.48)",
    600: "oklch(59.6% 0.145 163.225)",
    700: "oklch(50.8% 0.118 165.612)",
    800: "oklch(43.2% 0.095 166.913)",
    900: "oklch(37.8% 0.077 168.94)",
    950: "oklch(26.2% 0.051 172.552)",
  },
  highlight: {
    100: "oklch(97.3% 0.071 103.193)",
    200: "oklch(94.5% 0.129 101.54)",
    300: "oklch(90.5% 0.182 98.111)",
    400: "oklch(85.2% 0.199 91.936)",
    500: "oklch(79.5% 0.184 86.047)",
    600: "oklch(68.1% 0.162 75.834)",
    700: "oklch(55.4% 0.135 66.442)",
    800: "oklch(47.6% 0.114 61.907)",
    900: "oklch(42.1% 0.095 57.708)",
    950: "oklch(28.6% 0.066 53.813)",
  },
  category: {
    100: "oklch(93.2% 0.032 255.585)",
    200: "oklch(88.2% 0.059 254.128)",
    300: "oklch(80.9% 0.105 251.813)",
    400: "oklch(70.7% 0.165 254.624)",
    500: "oklch(62.3% 0.214 259.815)",
    600: "oklch(54.6% 0.245 262.881)",
    700: "oklch(48.8% 0.243 264.376)",
    800: "oklch(42.4% 0.199 265.638)",
    900: "oklch(37.9% 0.146 265.522)",
    950: "oklch(28.2% 0.091 267.935)",
  },
  special: {
    100: "oklch(94.3% 0.029 294.588)",
    200: "oklch(89.4% 0.057 293.283)",
    300: "oklch(81.1% 0.111 293.571)",
    400: "oklch(70.2% 0.183 293.541)",
    500: "oklch(60.6% 0.25 292.717)",
    600: "oklch(54.1% 0.281 293.009)",
    700: "oklch(49.1% 0.27 292.581)",
    800: "oklch(43.2% 0.232 292.759)",
    900: "oklch(38% 0.189 293.745)",
    950: "oklch(28.3% 0.141 291.089)",
  },
  vivid: {
    100: "oklch(95.2% 0.037 318.852)",
    200: "oklch(90.3% 0.076 319.62)",
    300: "oklch(83.3% 0.145 321.434)",
    400: "oklch(74% 0.238 322.16)",
    500: "oklch(66.7% 0.295 322.15)",
    600: "oklch(59.1% 0.293 322.896)",
    700: "oklch(51.8% 0.253 323.949)",
    800: "oklch(45.2% 0.211 324.591)",
    900: "oklch(40.1% 0.17 325.612)",
    950: "oklch(29.3% 0.136 325.661)",
  },
};

/**
 * In light mode the steps used as text (100-400), borders and tints (800-950) take their opposite so
 * they stay readable on light backgrounds; solid fills (500-700) keep their color so `on-solid` still
 * contrasts.
 */
export const LIGHT_RAMP_STEP_SOURCE: Record<ThemeRampStep, ThemeRampStep> = {
  100: 900,
  200: 800,
  300: 700,
  400: 700,
  500: 500,
  600: 600,
  700: 700,
  800: 300,
  900: 200,
  950: 100,
};

const rampTokens = (rampFor: (family: ThemeRampFamily) => Ramp) =>
  Object.fromEntries(
    THEME_RAMP_FAMILIES.flatMap((family) =>
      THEME_RAMP_STEPS.map((step) => [`${family}-${step}`, rampFor(family)[step]]),
    ),
  );

const DARK_NEUTRALS: Record<ThemeNeutralTokenKey, string> = {
  surface: "oklch(13% 0.028 261.692)",
  "surface-sunken": "oklch(12.9% 0.042 264.695)",
  "surface-raised": "oklch(20.8% 0.042 265.755)",
  "surface-muted": "oklch(21% 0.034 264.665)",
  "surface-elevated": "oklch(27.9% 0.041 260.031)",
  "surface-strong": "oklch(37.2% 0.044 257.287)",
  "surface-vox-detail": "#0b1120",
  "surface-toolbar": "#141f2d",
  "media-placeholder": "oklch(21% 0.034 264.665)",
  fg: "#fff",
  "fg-bright": "oklch(96.7% 0.003 264.542)",
  "fg-soft": "oklch(92.8% 0.006 264.531)",
  "fg-secondary": "oklch(87.2% 0.01 258.338)",
  "fg-muted": "oklch(70.7% 0.022 261.325)",
  "fg-subtle": "oklch(55.1% 0.027 264.364)",
  "fg-faint": "oklch(44.6% 0.03 256.802)",
  shade: "#000",
  "on-solid": "#fff",
  greentext: "#789922",
  glow: "rgb(56 189 248)",
  "glow-deep": "rgb(14 165 233)",
  "pinned-glow": "rgb(245 158 11)",
  "pinned-glow-soft": "rgb(251 191 36)",
  "comment-pin": "rgb(252 211 77)",
  "comment-pin-soft": "rgb(245 158 11)",
  "header-scrim": "#0000006b",
  "header-fg": "#ffffff",
  "header-text-bg": "#111827e6",
  "header-control": "#1e293b",
  "header-control-border": "#475569",
  "sidebar-bg": "#1f2937",
  "sidebar-fg": "#ffffff",
  "sidebar-muted": "#b6c2d2",
  "sidebar-accent": "#0284c7",
  "sidebar-accent-fg": "#ffffff",
};

const LIGHT_NEUTRALS: Record<ThemeNeutralTokenKey, string> = {
  surface: "oklch(96.7% 0.003 264.542)",
  "surface-sunken": "oklch(98.4% 0.003 247.858)",
  "surface-raised": "#fff",
  "surface-muted": "oklch(92.8% 0.006 264.531)",
  "surface-elevated": "oklch(96.8% 0.007 247.896)",
  "surface-strong": "oklch(86.9% 0.022 252.894)",
  "surface-vox-detail": "#f6f8fb",
  "surface-toolbar": "#e8edf3",
  /** Behind thumbnails: titles over media are white with an outline and need a mid-tone backdrop. */
  "media-placeholder": "oklch(44.6% 0.043 257.281)",
  fg: "oklch(20.8% 0.042 265.755)",
  "fg-bright": "oklch(12.9% 0.042 264.695)",
  "fg-soft": "oklch(27.9% 0.041 260.031)",
  "fg-secondary": "oklch(37.2% 0.044 257.287)",
  "fg-muted": "oklch(44.6% 0.043 257.281)",
  "fg-subtle": "oklch(55.4% 0.046 257.417)",
  "fg-faint": "oklch(70.4% 0.04 256.788)",
  shade: "#000",
  "on-solid": "#fff",
  greentext: "#3f6212",
  glow: "rgb(14 165 233)",
  "glow-deep": "rgb(2 132 199)",
  "pinned-glow": "rgb(217 119 6)",
  "pinned-glow-soft": "rgb(245 158 11)",
  "comment-pin": "rgb(161 98 7)",
  "comment-pin-soft": "rgb(202 138 4)",
  "header-scrim": "#0000006b",
  "header-fg": "#ffffff",
  "header-text-bg": "#111827e6",
  "header-control": "#1e293b",
  "header-control-border": "#475569",
  "sidebar-bg": "#ffffff",
  "sidebar-fg": "#1f2937",
  "sidebar-muted": "#526071",
  "sidebar-accent": "#0284c7",
  "sidebar-accent-fg": "#ffffff",
};

const SHARED_TOKENS: Record<ThemeSharedTokenKey, string> = {
  "on-media": "#fff",
  "media-scrim": "#000",
  "media-chip": "oklch(21% 0.006 285.885)",
  "pill-category": TAILWIND_RAMPS.category[600],
  "pill-replies": TAILWIND_RAMPS.category[600],
  "pill-poll": TAILWIND_RAMPS.warning[600],
  "pill-pinned": TAILWIND_RAMPS.highlight[600],
  "pill-new": TAILWIND_RAMPS.warning[500],
  "pill-youtube": TAILWIND_RAMPS.danger[600],
  "media-favorite": TAILWIND_RAMPS.highlight[400],
  "media-danger": TAILWIND_RAMPS.danger[500],
  "media-pin": TAILWIND_RAMPS.warning[300],
  "media-history": TAILWIND_RAMPS.caution[400],
  "avatar-blue": "#2980b9",
  "avatar-green": "#27ae60",
  "avatar-red": "#c0392b",
  "avatar-yellow": "#f1c40f",
  "avatar-pink": "#e91e8c",
  "avatar-brown": "#8d4a2e",
  "avatar-white": "#fff",
  "avatar-black": "#000",
  "avatar-gray": "oklch(44.6% 0.03 256.802)",
  "staff-flash-a": "rgb(30 64 175)",
  "staff-flash-b": "rgb(185 28 28)",
  "staff-crown": TAILWIND_RAMPS.warning[400],
};

export type BuiltinThemeId = "dark" | "light";

export type BuiltinTheme = {
  id: BuiltinThemeId;
  colorScheme: BuiltinThemeId;
  /** HSL lightness of data colors (poll) when used as text. */
  dataHueTextL: string;
  tokens: ThemeTokenMap;
};

export const BUILTIN_THEMES: Record<BuiltinThemeId, BuiltinTheme> = {
  dark: {
    id: "dark",
    colorScheme: "dark",
    dataHueTextL: "72%",
    tokens: {
      ...DARK_NEUTRALS,
      ...SHARED_TOKENS,
      ...rampTokens((family) => TAILWIND_RAMPS[family]),
    } as ThemeTokenMap,
  },
  light: {
    id: "light",
    colorScheme: "light",
    dataHueTextL: "34%",
    tokens: {
      ...LIGHT_NEUTRALS,
      ...SHARED_TOKENS,
      ...rampTokens((family) => {
        const ramp = TAILWIND_RAMPS[family];
        return Object.fromEntries(
          THEME_RAMP_STEPS.map((step) => [step, ramp[LIGHT_RAMP_STEP_SOURCE[step]]]),
        ) as Ramp;
      }),
    } as ThemeTokenMap,
  },
};
