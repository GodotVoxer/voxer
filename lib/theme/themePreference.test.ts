import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyResolvedTheme,
  CUSTOM_VARS_MAX,
  isThemeSafeMode,
  isValidCustomThemeVars,
  parseStoredThemePreference,
  parseStoredThemeState,
  readStoredDeviceThemePreference,
  readStoredThemePreference,
  resolveThemePreference,
  serializeThemePreference,
  serializeThemeState,
  THEME_DEVICE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  writeStoredThemePreference,
} from "./themePreference";

const fakeRoot = () => {
  const attributes = new Map<string, string>();
  const classes = new Set<string>();
  return {
    attributes,
    classes,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    classList: {
      toggle: (token: string, force?: boolean) =>
        force ? classes.add(token) : classes.delete(token),
    },
    style: { colorScheme: "" },
  };
};

const customState = {
  preference: "custom" as const,
  custom: {
    id: "cltheme123",
    base: "light" as const,
    vars: { fg: "#101010", "brand-600": "#7c3aed" },
    headerBackground: { kind: "none" as const },
  },
};

describe("parseStoredThemeState", () => {
  it("reads builtin modes and valid custom themes", () => {
    expect(parseStoredThemePreference(serializeThemePreference("light"))).toBe("light");
    expect(parseStoredThemePreference(serializeThemePreference("system"))).toBe("system");
    expect(parseStoredThemeState(serializeThemeState(customState))).toEqual(customState);
  });

  it.each([
    null,
    "",
    "light",
    "{",
    '{"mode":"sepia"}',
    '{"mode":1}',
    "[]",
    '{"mode":"light\\"><b>"}',
    '{"mode":"custom"}',
    '{"mode":"custom","custom":{"id":"x","base":"sepia","vars":{}}}',
    '{"mode":"custom","custom":{"id":"../x","base":"dark","vars":{}}}',
    '{"mode":"custom","custom":{"id":"x","base":"dark","vars":{"fg":"red"}}}',
    '{"mode":"custom","custom":{"id":"x","base":"dark","vars":{"fg;color:red":"#ffffff"}}}',
    '{"mode":"custom","custom":{"id":"x","base":"dark","vars":{"fg":"#ffffff;background:url(x)"}}}',
    '{"mode":"custom","custom":{"id":"x","base":"dark","vars":[]}}',
    '{"mode":"custom","custom":{"id":"x","base":"dark","vars":{},"headerBackground":{"kind":"solid","color":"url(x)"}}}',
  ])("vuelve a oscuro con caché ausente o inválida: %s", (raw) => {
    expect(parseStoredThemeState(raw)).toEqual({ preference: "dark", custom: null });
  });
});

describe("isValidCustomThemeVars", () => {
  it("caps the number of variables", () => {
    const many = Object.fromEntries(
      Array.from({ length: CUSTOM_VARS_MAX + 1 }, (_, i) => [`v${i}`, "#000000"]),
    );
    expect(isValidCustomThemeVars(many)).toBe(false);
    expect(isValidCustomThemeVars({ surface: "#000000" })).toBe(true);
  });
});

describe("serializeThemeState", () => {
  it("stores a custom theme without data as the default", () => {
    expect(serializeThemeState({ preference: "custom", custom: null })).toBe('{"mode":"dark"}');
  });
});

describe("resolveThemePreference", () => {
  it("honours the explicit choice, follows the system and uses the custom base", () => {
    expect(resolveThemePreference("dark", true)).toBe("dark");
    expect(resolveThemePreference("light", false)).toBe("light");
    expect(resolveThemePreference("system", true)).toBe("light");
    expect(resolveThemePreference("system", false)).toBe("dark");
    expect(resolveThemePreference("custom", true, "light")).toBe("light");
    expect(resolveThemePreference("custom", true)).toBe("dark");
  });
});

describe("isThemeSafeMode", () => {
  it.each(["?tema=seguro", "?a=1&tema=seguro", "?tema=seguro&b=2"])("detects %s", (search) => {
    expect(isThemeSafeMode(search)).toBe(true);
  });

  it.each(["", "?tema=seguros", "?xtema=seguro", "?tema=claro"])("ignores %s", (search) => {
    expect(isThemeSafeMode(search)).toBe(false);
  });
});

describe("applyResolvedTheme", () => {
  it("sets data-theme, the dark class and color-scheme", () => {
    const root = fakeRoot();
    applyResolvedTheme(root, "light");
    expect(root.attributes.get("data-theme")).toBe("light");
    expect(root.classes.has("dark")).toBe(false);
    expect(root.style.colorScheme).toBe("light");
    applyResolvedTheme(root, "dark");
    expect(root.classes.has("dark")).toBe(true);
  });
});

describe("storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes and reads the preference; the device one is never custom", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
      },
    });
    writeStoredThemePreference("system");
    expect(store.get(THEME_STORAGE_KEY)).toBe('{"mode":"system"}');
    expect(readStoredThemePreference()).toBe("system");
    store.set(THEME_DEVICE_STORAGE_KEY, serializeThemeState(customState));
    expect(readStoredDeviceThemePreference()).toBeNull();
  });

  it("does not break when storage is blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(() => writeStoredThemePreference("light")).not.toThrow();
    expect(readStoredThemePreference()).toBe("dark");
  });
});
