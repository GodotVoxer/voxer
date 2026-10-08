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
import {
  SEASONAL_THEME_ENDS_AT,
  SEASONAL_THEME_NAME,
  SEASONAL_THEME_STARTS_AT,
  SEASONAL_THEME_STORAGE_KEY,
  SEASONAL_THEME_SURFACE,
} from "@/lib/theme/seasonalTheme";
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

/** Delays beyond this overflow `setTimeout` (about 24.8 days) and would fire at once. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/** Next start or end of the seasonal window, so an open tab switches without reloading. */
const msUntilSeasonalBoundary = (now: number): number | null => {
  const next = [SEASONAL_THEME_STARTS_AT, SEASONAL_THEME_ENDS_AT].find((at) => at > now);
  return next === undefined ? null : Math.min(next - now, MAX_TIMEOUT_MS);
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
  const seasonalThemeActive = useThemeStore((s) => s.seasonalThemeActive);
  const hydrate = useThemeStore((s) => s.hydrate);
  const setSystemPrefersLight = useThemeStore((s) => s.setSystemPrefersLight);
  const refreshSeasonalTheme = useThemeStore((s) => s.refreshSeasonalTheme);

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_LIGHT_MEDIA_QUERY);
    const refreshSeasonal = () => refreshSeasonalTheme(Date.now());
    refreshSeasonal();
    hydrate(readStoredThemeState(), media.matches);
    const onSystemChange = (event: MediaQueryListEvent) => setSystemPrefersLight(event.matches);
    const onStorage = (event: StorageEvent) => {
      if (event.key === SEASONAL_THEME_STORAGE_KEY) refreshSeasonal();
      if (event.key !== THEME_STORAGE_KEY) return;
      hydrate(parseStoredThemeState(event.newValue), media.matches);
    };
    let boundaryTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleBoundary = () => {
      const delay = msUntilSeasonalBoundary(Date.now());
      if (delay === null) return;
      boundaryTimer = setTimeout(() => {
        refreshSeasonal();
        scheduleBoundary();
      }, delay);
    };
    scheduleBoundary();
    media.addEventListener("change", onSystemChange);
    window.addEventListener("storage", onStorage);
    return () => {
      clearTimeout(boundaryTimer);
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [hydrate, setSystemPrefersLight, refreshSeasonalTheme]);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    const safeMode = isThemeSafeMode(window.location.search);
    const activeCustom = preference === "custom" ? customTheme : null;
    const seasonal = seasonalThemeActive && !draft && !safeMode;
    if (seasonal) {
      applyResolvedTheme(root, "dark");
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", SEASONAL_THEME_SURFACE);
      notifyNativeTheme("dark", { surface: SEASONAL_THEME_SURFACE });
      clearCustomVariables(root);
      clearHeaderBackground(root);
      root.setAttribute("data-seasonal-theme", SEASONAL_THEME_NAME);
      root.setAttribute("data-theme-custom", "true");
      root.setAttribute("data-theme-header-background", "true");
      return;
    }
    root.removeAttribute("data-seasonal-theme");
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
    // Custom theme only cached (before `/auth/me`): paint the cache like the inline script, which
    // skipped it if the seasonal theme was showing.
    if (!source) {
      const cached = useThemeStore.getState().cachedCustom;
      if (cached) {
        root.setAttribute("data-theme-custom", "true");
        setCustomVariables(root, cached.vars);
        setHeaderBackground(root, cached.headerBackground);
      }
      return;
    }

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
  }, [
    hydrated,
    preference,
    systemPrefersLight,
    customTheme,
    cachedCustom?.base,
    cachedCustom?.id,
    draft,
    seasonalThemeActive,
  ]);

  return null;
};
