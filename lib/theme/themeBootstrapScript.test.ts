import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SEASONAL_THEME_ENDS_AT,
  SEASONAL_THEME_STORAGE_KEY,
  serializeSeasonalThemeChoice,
} from "./seasonalTheme";
import { THEME_BOOTSTRAP_SCRIPT } from "./themeBootstrapScript";
import { CUSTOM_VARS_MAX, THEME_STORAGE_KEY } from "./themePreference";

const OUTSIDE_SEASON = new Date("2026-01-15T15:00:00.000Z");
const IN_SEASON = new Date("2026-10-31T23:00:00.000Z");

type RunOptions = {
  stored?: string | null;
  seasonal?: string | null;
  systemLight?: boolean;
  storageThrows?: boolean;
  search?: string;
};

const runBootstrap = ({
  stored = null,
  seasonal = null,
  systemLight = false,
  storageThrows = false,
  search = "",
}: RunOptions) => {
  const attributes = new Map<string, string>([["data-theme", "dark"]]);
  const classes = new Set<string>(["dark"]);
  const properties = new Map<string, string>();
  const documentStub = {
    documentElement: {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      classList: {
        toggle: (token: string, force?: boolean) =>
          force ? classes.add(token) : classes.delete(token),
      },
      style: {
        colorScheme: "dark",
        setProperty: (name: string, value: string) => properties.set(name, value),
      },
    },
  };
  const localStorageStub = {
    getItem: (key: string) => {
      if (storageThrows) throw new Error("SecurityError");
      if (key === SEASONAL_THEME_STORAGE_KEY) return seasonal;
      return key === THEME_STORAGE_KEY ? stored : null;
    },
  };
  const matchMediaStub = () => ({ matches: systemLight });
  const run = new Function(
    "document",
    "localStorage",
    "matchMedia",
    "location",
    THEME_BOOTSTRAP_SCRIPT,
  );
  run(documentStub, localStorageStub, matchMediaStub, { search });
  return {
    theme: attributes.get("data-theme"),
    dark: classes.has("dark"),
    colorScheme: documentStub.documentElement.style.colorScheme,
    custom: attributes.get("data-theme-custom"),
    seasonal: attributes.get("data-seasonal-theme"),
    properties: Object.fromEntries(properties),
  };
};

const customCache = (
  vars: Record<string, unknown>,
  base = "light",
  headerBackground: unknown = { kind: "none" },
) => JSON.stringify({ mode: "custom", custom: { id: "cltheme1", base, vars, headerBackground } });

describe("THEME_BOOTSTRAP_SCRIPT", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(OUTSIDE_SEASON);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps dark without a stored preference", () => {
    expect(runBootstrap({})).toEqual({
      theme: "dark",
      dark: true,
      colorScheme: "dark",
      custom: undefined,
      seasonal: undefined,
      properties: {},
    });
  });

  it("applies a stored light theme before hydration", () => {
    expect(runBootstrap({ stored: '{"mode":"light"}' })).toMatchObject({
      theme: "light",
      dark: false,
      colorScheme: "light",
    });
  });

  it("follows the OS in system mode", () => {
    expect(runBootstrap({ stored: '{"mode":"system"}', systemLight: true }).theme).toBe("light");
    expect(runBootstrap({ stored: '{"mode":"system"}', systemLight: false }).theme).toBe("dark");
  });

  it("custom theme: applies the base and only valid variables", () => {
    const result = runBootstrap({
      stored: customCache({
        fg: "#101010",
        "brand-600": "#7c3aed80",
        "bad;name": "#ffffff",
        surface: "red",
        "surface-raised": "#ffffff;background:url(x)",
        "--double": "#000000",
        Upper: "#000000",
        number: 42,
      }),
    });
    expect(result.theme).toBe("light");
    expect(result.custom).toBe("true");
    expect(result.properties).toEqual({ "--fg": "#101010", "--brand-600": "#7c3aed80" });
  });

  it("with ?tema=seguro ignores the variables but keeps the base", () => {
    const result = runBootstrap({ stored: customCache({ fg: "#101010" }), search: "?tema=seguro" });
    expect(result.theme).toBe("light");
    expect(result.custom).toBeUndefined();
    expect(result.properties).toEqual({});
  });

  it("applies a structured header gradient and rejects arbitrary CSS", () => {
    const valid = runBootstrap({
      stored: customCache({}, "dark", {
        kind: "gradient",
        type: "linear",
        angleDeg: 180,
        stops: [
          { color: "#5bcefa", pos: 0 },
          { color: "#f5a9b8", pos: 100 },
        ],
      }),
    });
    expect(valid.properties["--theme-header-background"]).toContain("linear-gradient(180deg");

    const hostile = runBootstrap({
      stored: customCache({}, "dark", { kind: "solid", color: "url(javascript:alert(1))" }),
    });
    expect(hostile.properties["--theme-header-background"]).toBeUndefined();
  });

  it("applies none when there are too many variables", () => {
    const vars = Object.fromEntries(
      Array.from({ length: CUSTOM_VARS_MAX + 1 }, (_, i) => [`v${i}`, "#000000"]),
    );
    expect(runBootstrap({ stored: customCache(vars) }).properties).toEqual({});
  });

  it.each([
    "{",
    '{"mode":"sepia"}',
    '{"mode":"light\\" onload=\\"x"}',
    '"light"',
    "null",
    '{"mode":"custom"}',
    '{"mode":"custom","custom":{"base":"sepia","vars":{}}}',
  ])("ignora caché inválida u hostil: %s", (stored) => {
    const result = runBootstrap({ stored });
    expect(result.theme).toBe("dark");
    expect(result.properties).toEqual({});
  });

  it("does not throw when storage is blocked", () => {
    expect(runBootstrap({ storageThrows: true }).theme).toBe("dark");
  });

  describe("seasonal theme", () => {
    beforeEach(() => {
      vi.setSystemTime(IN_SEASON);
    });

    it("covers the stored theme without touching it and skips custom variables", () => {
      const result = runBootstrap({ stored: customCache({ fg: "#101010" }) });
      expect(result).toMatchObject({
        theme: "dark",
        dark: true,
        colorScheme: "dark",
        seasonal: "halloween",
        custom: "true",
        properties: {},
      });
    });

    it("respects turning it off on this device", () => {
      const result = runBootstrap({
        stored: '{"mode":"light"}',
        seasonal: serializeSeasonalThemeChoice(false),
      });
      expect(result.theme).toBe("light");
      expect(result.seasonal).toBeUndefined();
    });

    it("ignores a choice from another season or a corrupt one", () => {
      expect(runBootstrap({ seasonal: '{"id":"halloween-2025","enabled":false}' }).seasonal).toBe(
        "halloween",
      );
      expect(runBootstrap({ seasonal: "{" }).seasonal).toBe("halloween");
    });

    it("ends at the end of the window", () => {
      vi.setSystemTime(SEASONAL_THEME_ENDS_AT);
      expect(runBootstrap({ stored: '{"mode":"light"}' })).toMatchObject({
        theme: "light",
        seasonal: undefined,
      });
    });

    it("stays out with ?tema=seguro", () => {
      expect(runBootstrap({ search: "?tema=seguro" }).seasonal).toBeUndefined();
    });
  });
});
