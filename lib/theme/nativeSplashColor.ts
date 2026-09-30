/**
 * Colors duplicated in `android/app/src/main/res/values/colors.xml` (splash, window, WebView before
 * first paint, native error screen). Declared here so the test re-derives them from `BUILTIN_THEMES`.
 */
export const ANDROID_SPLASH_DARK_HEX = "#030712";
export const ANDROID_SPLASH_LIGHT_HEX = "#f3f4f6";
export const ANDROID_BRAND_HEX = "#0084d1";
/** Text of the native error screen, always drawn on the dark background. */
export const ANDROID_ON_SURFACE_DARK_HEX = "#ffffff";
export const ANDROID_ON_SURFACE_MUTED_DARK_HEX = "#99a1af";
/** Text on solid color fills (the Retry button). */
export const ANDROID_ON_SOLID_HEX = "#ffffff";

const HEX6 = /^#[0-9a-f]{6}$/i;

/** Window and status bar color of the native app; a custom theme may override `surface`. */
export const nativeSurfaceHex = (
  resolved: "dark" | "light",
  overrides?: Readonly<Record<string, string>> | null,
): string => {
  const custom = overrides?.surface;
  if (typeof custom === "string" && HEX6.test(custom)) return custom.toLowerCase();
  return resolved === "light" ? ANDROID_SPLASH_LIGHT_HEX : ANDROID_SPLASH_DARK_HEX;
};
