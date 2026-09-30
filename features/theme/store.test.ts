import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomThemeDto } from "@/lib/theme/customTheme";
import { THEME_DEVICE_STORAGE_KEY, THEME_STORAGE_KEY } from "@/lib/theme/themePreference";
import { useThemeStore } from "./store";

const theme = (overrides: Partial<CustomThemeDto> = {}): CustomThemeDto => ({
  id: "cltheme1",
  name: "Noche",
  base: "light",
  overrides: { brand: "#7c3aed" },
  headerBackground: { kind: "none" },
  voxBackground: { kind: "none" },
  version: 1,
  updatedAt: "2026-09-14T12:00:00.000Z",
  ...overrides,
});

describe("useThemeStore", () => {
  const stored = new Map<string, string>();

  beforeEach(() => {
    stored.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => stored.get(k) ?? null,
        setItem: (k: string, v: string) => stored.set(k, v),
      },
    });
    useThemeStore.setState({
      preference: "dark",
      systemPrefersLight: false,
      hydrated: false,
      accountBound: false,
      pendingServerSync: null,
      customTheme: null,
      cachedCustom: null,
      draft: null,
      customThemes: null,
      editor: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hydrates the preference, the custom cache and the system mode", () => {
    const custom = {
      id: "cltheme1",
      base: "light" as const,
      vars: { fg: "#101010" },
      headerBackground: { kind: "none" as const },
    };
    useThemeStore.getState().hydrate({ preference: "custom", custom }, true);
    expect(useThemeStore.getState()).toMatchObject({
      preference: "custom",
      cachedCustom: custom,
      systemPrefersLight: true,
      hydrated: true,
    });
  });

  it("without a session a choice is stored as applied and device preference, not pending", () => {
    useThemeStore.getState().setPreference("light");
    expect(useThemeStore.getState()).toMatchObject({
      preference: "light",
      pendingServerSync: null,
    });
    expect(stored.get(THEME_STORAGE_KEY)).toBe('{"mode":"light"}');
    expect(stored.get(THEME_DEVICE_STORAGE_KEY)).toBe('{"mode":"light"}');
  });

  it("with a session a choice stays pending upload and leaves the device preference alone", () => {
    useThemeStore.getState().setPreference("light");
    useThemeStore.getState().setAccountBound(true);
    useThemeStore.getState().setPreference("system");
    expect(useThemeStore.getState().pendingServerSync).toEqual({ mode: "system" });
    expect(stored.get(THEME_DEVICE_STORAGE_KEY)).toBe('{"mode":"light"}');
    useThemeStore.getState().markServerSynced({ mode: "system" });
    expect(useThemeStore.getState().pendingServerSync).toBeNull();
  });

  it("picking a custom theme stays pending with its id; confirmations for another id are ignored", () => {
    useThemeStore.getState().setAccountBound(true);
    useThemeStore.getState().selectCustomTheme(theme());
    expect(useThemeStore.getState()).toMatchObject({
      preference: "custom",
      pendingServerSync: { mode: "custom", themeId: "cltheme1" },
    });
    useThemeStore.getState().markServerSynced({ mode: "custom", themeId: "otro" });
    expect(useThemeStore.getState().pendingServerSync).not.toBeNull();
  });

  it("adopting custom without a document falls back to dark", () => {
    useThemeStore.getState().adoptSelection("custom", null);
    expect(useThemeStore.getState().preference).toBe("dark");
    expect(stored.get(THEME_STORAGE_KEY)).toBe('{"mode":"dark"}');
  });

  it("caching custom variables writes the cache for the inline script", () => {
    const custom = {
      id: "cltheme1",
      base: "light" as const,
      vars: { fg: "#101010" },
      headerBackground: { kind: "none" as const },
    };
    useThemeStore.getState().cacheCustomVariables(custom);
    expect(JSON.parse(stored.get(THEME_STORAGE_KEY) ?? "{}")).toEqual({ mode: "custom", custom });
  });

  it("deleting the active custom theme returns to its base", () => {
    useThemeStore.setState({
      preference: "custom",
      customTheme: theme(),
      customThemes: [theme(), theme({ id: "cltheme2" })],
    });
    useThemeStore.getState().removeCustomTheme("cltheme1");
    expect(useThemeStore.getState()).toMatchObject({ preference: "light", customTheme: null });
    expect(useThemeStore.getState().customThemes?.map((t) => t.id)).toEqual(["cltheme2"]);
  });

  it("upsert updates the list and the active document", () => {
    useThemeStore.setState({ preference: "custom", customTheme: theme(), customThemes: [theme()] });
    useThemeStore.getState().upsertCustomTheme(theme({ version: 2, name: "Renombrado" }));
    expect(useThemeStore.getState().customTheme?.version).toBe(2);
    expect(useThemeStore.getState().customThemes?.[0].name).toBe("Renombrado");
  });

  it("logout drops themes, draft and editor", () => {
    useThemeStore.getState().setAccountBound(true);
    useThemeStore.setState({
      customThemes: [theme()],
      editor: { kind: "edit", themeId: "cltheme1" },
      draft: {
        name: "x",
        base: "dark",
        overrides: {},
        headerBackground: { kind: "none" },
        voxBackground: { kind: "none" },
      },
    });
    useThemeStore.getState().setAccountBound(false);
    expect(useThemeStore.getState()).toMatchObject({
      customThemes: null,
      draft: null,
      editor: null,
    });
  });
});
