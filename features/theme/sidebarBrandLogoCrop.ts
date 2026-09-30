/** Same 1024x1024 framing in both, derived from `vox-welcome.png` by `scripts/generateSidebarBrandLogos.ts`. */
export const SIDEBAR_BRAND_LOGO_URL = {
  dark: "/vox-logo-dark.png",
  light: "/vox-logo-light.png",
} as const;

/** Vertical crop of the 1024x1024 logo in a wide banner: `object-cover` crops top and bottom and keeps the full width. */
export const SIDEBAR_BRAND_LOGO_OBJECT_POSITION = "50% 60%";

/** Visible banner height in the sidebar (px). */
export const SIDEBAR_BRAND_LOGO_HEIGHT_PX = 160;

/**
 * In the edge-to-edge Android app the sidebar starts under the status bar and camera: the banner grows
 * by `safe-area-inset-top` and the logo moves down the same. `object-position` at 60% only moves
 * `0.6 x inset`, so the remaining `0.4 x inset` completes it (change both if 60% changes).
 */
export const SIDEBAR_BRAND_LOGO_BOX_HEIGHT = `calc(${SIDEBAR_BRAND_LOGO_HEIGHT_PX}px + env(safe-area-inset-top, 0px))`;

export const SIDEBAR_BRAND_LOGO_SAFE_OBJECT_POSITION =
  "50% calc(60% + env(safe-area-inset-top, 0px) * 0.4)";
