"use client";
import { useEffect } from "react";
import { useThemeStore } from "@/features/theme/store";
import {
  applyResolvedTheme,
  CUSTOM_VAR_NAME_RE,
  CUSTOM_VAR_VALUE_RE,
  isThemeSafeMode,
  parseStoredThemeState,
  readStoredThemeState,
  resolveThemePreference,
  SYSTEM_LIGHT_MEDIA_QUERY,
  THEME_COLOR_META,
  THEME_STORAGE_KEY,
} from "@/lib/theme/themePreference";
import { THEME_TOKEN_KEYS } from "@/lib/theme/themeTokens";
import { headerBackgroundCss } from "@/lib/theme/headerBackgroundCss";
import { nativeSurfaceHex } from "@/lib/theme/nativeSplashColor";
import { readAndroidBridge } from "@/features/native/androidBridge";

const clearCustomVariables = (root: HTMLElement) => {
  for (const key of THEME_TOKEN_KEYS) root.style.removeProperty(`--${key}`);
};

/** Revalidates names and values even from our own derivation: only `--token: #hex` reaches the DOM. */
const setCustomVariables = (root: HTMLElement, vars: Record<string, string>) => {
  clearCustomVariables(root);
  for (const [name, value] of Object.entries(vars)) {
    if (CUSTOM_VAR_NAME_RE.test(name) && CUSTOM_VAR_VALUE_RE.test(value)) {
      root.style.setProperty(`--${name}`, value);
    }
  }
};

const clearHeaderBackground = (root: HTMLElement) => {
  root.style.removeProperty("--theme-header-background");
  root.removeAttribute("data-theme-header-background");
};

const setHeaderBackground = (root: HTMLElement, background: unknown) => {
  clearHeaderBackground(root);
  const css = headerBackgroundCss(background);
  if (!css) return;
  root.style.setProperty("--theme-header-background", css);
  root.setAttribute("data-theme-header-background", "true");
};

/** The Android app needs the resolved theme to paint its window and invert status bar icons, which would be invisible on a light header. */
const notifyNativeTheme = (
  resolved: "dark" | "light",
  overrides?: Readonly<Record<string, string>> | null,
) => {
  const bridge = readAndroidBridge(window);
  if (!bridge) return;
  try {
    bridge.setThemeColors(resolved, nativeSurfaceHex(resolved, overrides));
  } catch {
    /* an older bridge must not break the theme */
  }
};

export const ThemeApplier = () => {
  const preference = useThemeStore((s) => s.preference);
  const systemPrefersLight = useThemeStore((s) => s.systemPrefersLight);
  const hydrated = useThemeStore((s) => s.hydrated);
  const customTheme = useThemeStore((s) => s.customTheme);
  const cachedCustom = useThemeStore((s) => s.cachedCustom);
  const draft = useThemeStore((s) => s.draft);
  const hydrate = useThemeStore((s) => s.hydrate);
  const setSystemPrefersLight = useThemeStore((s) => s.setSystemPrefersLight);

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_LIGHT_MEDIA_QUERY);
    hydrate(readStoredThemeState(), media.matches);
    const onSystemChange = (event: MediaQueryListEvent) => setSystemPrefersLight(event.matches);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      hydrate(parseStoredThemeState(event.newValue), media.matches);
    };
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [hydrate, setSystemPrefersLight]);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    const safeMode = isThemeSafeMode(window.location.search);
    const activeCustom = preference === "custom" ? customTheme : null;
    const source = draft ?? activeCustom;
    const resolved = source
      ? source.base
      : resolveThemePreference(preference, systemPrefersLight, cachedCustom?.base);
    applyResolvedTheme(root, resolved);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLOR_META[resolved]);
    notifyNativeTheme(resolved, source?.overrides as Record<string, string> | undefined);

    if (safeMode || (!source && preference !== "custom")) {
      clearCustomVariables(root);
      clearHeaderBackground(root);
      root.removeAttribute("data-theme-custom");
      return;
    }
    // Custom theme only cached (before `/auth/me`): keep the variables the inline script set.
    if (!source) return;

    root.setAttribute("data-theme-custom", "true");
    setHeaderBackground(root, source.headerBackground);

    let cancelled = false;
    void import("@/lib/theme/customThemeVariables").then(({ customThemeCssVariables }) => {
      if (cancelled) return;
      const vars = customThemeCssVariables(source.base, source.overrides);
      setCustomVariables(root, vars);
      if (!draft && activeCustom) {
        useThemeStore.getState().cacheCustomVariables({
          id: activeCustom.id,
          base: activeCustom.base,
          vars,
          headerBackground: activeCustom.headerBackground,
        });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, preference, systemPrefersLight, customTheme, cachedCustom?.base, draft]);

  return null;
};
