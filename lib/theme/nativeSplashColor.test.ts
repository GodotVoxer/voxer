import { describe, expect, it } from "vitest";
import { BUILTIN_THEMES } from "@/lib/theme/builtinThemes";
import { cssColorToHex } from "@/lib/theme/colorMath";
import {
  ANDROID_BRAND_HEX,
  ANDROID_ON_SOLID_HEX,
  ANDROID_ON_SURFACE_DARK_HEX,
  ANDROID_ON_SURFACE_MUTED_DARK_HEX,
  ANDROID_SPLASH_DARK_HEX,
  ANDROID_SPLASH_LIGHT_HEX,
  nativeSurfaceHex,
} from "@/lib/theme/nativeSplashColor";

/**
 * A failure means the theme changed: update `android/app/src/main/res/values/colors.xml`, or the
 * app shows a different color before the WebView's first paint.
 */
describe("Android native colors", () => {
  const dark = BUILTIN_THEMES.dark.tokens;

  it("the dark splash background is the dark surface", () => {
    expect(cssColorToHex(dark.surface)).toBe(ANDROID_SPLASH_DARK_HEX);
  });

  it("the light background is the light surface", () => {
    expect(cssColorToHex(BUILTIN_THEMES.light.tokens.surface)).toBe(ANDROID_SPLASH_LIGHT_HEX);
  });

  it("the notification accent is brand-600", () => {
    expect(cssColorToHex(dark["brand-600"])).toBe(ANDROID_BRAND_HEX);
  });

  it("the error screen texts are the dark fg and fg-muted", () => {
    expect(cssColorToHex(dark.fg)).toBe(ANDROID_ON_SURFACE_DARK_HEX);
    expect(cssColorToHex(dark["fg-muted"])).toBe(ANDROID_ON_SURFACE_MUTED_DARK_HEX);
  });

  it("the solid button text is on-solid", () => {
    expect(cssColorToHex(dark["on-solid"])).toBe(ANDROID_ON_SOLID_HEX);
  });

  it("they are lowercase with 6 digits, as Android expects", () => {
    for (const hex of [
      ANDROID_SPLASH_DARK_HEX,
      ANDROID_SPLASH_LIGHT_HEX,
      ANDROID_BRAND_HEX,
      ANDROID_ON_SURFACE_DARK_HEX,
      ANDROID_ON_SURFACE_MUTED_DARK_HEX,
      ANDROID_ON_SOLID_HEX,
    ]) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe("nativeSurfaceHex", () => {
  it("uses the builtin surface for the resolved mode", () => {
    expect(nativeSurfaceHex("dark")).toBe(ANDROID_SPLASH_DARK_HEX);
    expect(nativeSurfaceHex("light")).toBe(ANDROID_SPLASH_LIGHT_HEX);
  });

  it("honours a custom theme's surface", () => {
    expect(nativeSurfaceHex("dark", { surface: "#112233" })).toBe("#112233");
    expect(nativeSurfaceHex("dark", { surface: "#AABBCC" })).toBe("#aabbcc");
  });

  it("ignores an override that is not a 6-digit hex", () => {
    expect(nativeSurfaceHex("dark", { surface: "rojo" })).toBe(ANDROID_SPLASH_DARK_HEX);
    expect(nativeSurfaceHex("light", { surface: "#abc" })).toBe(ANDROID_SPLASH_LIGHT_HEX);
    expect(nativeSurfaceHex("light", {})).toBe(ANDROID_SPLASH_LIGHT_HEX);
    expect(nativeSurfaceHex("light", null)).toBe(ANDROID_SPLASH_LIGHT_HEX);
  });
});
