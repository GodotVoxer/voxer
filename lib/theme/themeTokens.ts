const THEME_NEUTRAL_TOKEN_KEYS = [
  "surface",
  "surface-sunken",
  "surface-raised",
  "surface-muted",
  "surface-elevated",
  "surface-strong",
  "surface-vox-detail",
  "surface-toolbar",
  "media-placeholder",
  "fg",
  "fg-bright",
  "fg-soft",
  "fg-secondary",
  "fg-muted",
  "fg-subtle",
  "fg-faint",
  "shade",
  "on-solid",
  "greentext",
  "glow",
  "glow-deep",
  "pinned-glow",
  "pinned-glow-soft",
  "comment-pin",
  "comment-pin-soft",
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
] as const;

/**
 * Colors drawn over user media or used as identity (avatars, card labels): the same in dark and light
 * because the backdrop is not the theme's, but custom themes can change them.
 */
export const THEME_SHARED_TOKEN_KEYS = [
  "on-media",
  "media-scrim",
  "media-chip",
  "pill-category",
  "pill-replies",
  "pill-poll",
  "pill-pinned",
  "pill-new",
  "pill-youtube",
  "media-favorite",
  "media-danger",
  "media-pin",
  "media-history",
  "avatar-blue",
  "avatar-green",
  "avatar-red",
  "avatar-yellow",
  "avatar-pink",
  "avatar-brown",
  "avatar-white",
  "avatar-black",
  "avatar-gray",
  "staff-flash-a",
  "staff-flash-b",
  "staff-crown",
] as const;

export const THEME_RAMP_FAMILIES = [
  "brand",
  "danger",
  "warning",
  "caution",
  "success",
  "highlight",
  "category",
  "special",
  "vivid",
] as const;

export const THEME_RAMP_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export type ThemeNeutralTokenKey = (typeof THEME_NEUTRAL_TOKEN_KEYS)[number];
export type ThemeSharedTokenKey = (typeof THEME_SHARED_TOKEN_KEYS)[number];
export type ThemeRampFamily = (typeof THEME_RAMP_FAMILIES)[number];
export type ThemeRampStep = (typeof THEME_RAMP_STEPS)[number];
export type ThemeTokenKey =
  | ThemeNeutralTokenKey
  | ThemeSharedTokenKey
  | `${ThemeRampFamily}-${ThemeRampStep}`;
export type ThemeTokenMap = Record<ThemeTokenKey, string>;

export const THEME_TOKEN_KEYS: readonly ThemeTokenKey[] = [
  ...THEME_NEUTRAL_TOKEN_KEYS,
  ...THEME_SHARED_TOKEN_KEYS,
  ...THEME_RAMP_FAMILIES.flatMap((family) =>
    THEME_RAMP_STEPS.map((step) => `${family}-${step}` as const),
  ),
];

export type ContrastPair = { fg: ThemeTokenKey; bg: ThemeTokenKey; min: number };

/** Text/background pairs the UI actually uses. 4.5 is AA normal text; 3 is AA large text, buttons or secondary metadata. */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { fg: "fg", bg: "surface", min: 4.5 },
  { fg: "fg", bg: "surface-sunken", min: 4.5 },
  { fg: "fg", bg: "surface-raised", min: 4.5 },
  { fg: "fg", bg: "surface-elevated", min: 4.5 },
  { fg: "fg", bg: "surface-vox-detail", min: 4.5 },
  { fg: "fg", bg: "surface-toolbar", min: 4.5 },
  { fg: "fg-soft", bg: "surface-raised", min: 4.5 },
  { fg: "fg-secondary", bg: "surface-raised", min: 4.5 },
  { fg: "fg-muted", bg: "surface", min: 4.5 },
  { fg: "fg-muted", bg: "surface-raised", min: 4.5 },
  { fg: "fg-muted", bg: "surface-vox-detail", min: 4.5 },
  { fg: "fg-subtle", bg: "surface", min: 3 },
  { fg: "fg-subtle", bg: "surface-raised", min: 3 },
  { fg: "brand-100", bg: "surface-raised", min: 4.5 },
  { fg: "brand-300", bg: "surface-raised", min: 4.5 },
  { fg: "brand-400", bg: "surface-vox-detail", min: 4.5 },
  { fg: "danger-400", bg: "surface-raised", min: 4.5 },
  { fg: "danger-400", bg: "surface-vox-detail", min: 4.5 },
  { fg: "warning-300", bg: "surface-raised", min: 4.5 },
  { fg: "success-400", bg: "surface-raised", min: 4.5 },
  { fg: "greentext", bg: "surface-vox-detail", min: 4.5 },
  { fg: "comment-pin", bg: "surface-vox-detail", min: 3 },
  { fg: "comment-pin", bg: "surface-raised", min: 3 },
  { fg: "on-solid", bg: "brand-600", min: 3 },
  { fg: "on-solid", bg: "category-600", min: 3 },
  { fg: "on-solid", bg: "success-700", min: 3 },
  { fg: "on-solid", bg: "warning-700", min: 3 },
  { fg: "on-solid", bg: "danger-600", min: 3 },
  { fg: "on-media", bg: "pill-category", min: 3 },
  { fg: "on-media", bg: "pill-replies", min: 3 },
  { fg: "header-fg", bg: "header-control", min: 4.5 },
  { fg: "header-fg", bg: "header-text-bg", min: 4.5 },
  { fg: "sidebar-fg", bg: "sidebar-bg", min: 4.5 },
  { fg: "sidebar-accent-fg", bg: "sidebar-accent", min: 3 },
];
