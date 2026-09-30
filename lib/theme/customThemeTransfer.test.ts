import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { CustomThemeInput } from "./customTheme";
import { customThemeInputSchema } from "./customThemeSchema";
import {
  CUSTOM_THEME_IMPORT_MAX_BYTES,
  customThemeExportFileName,
  parseCustomThemeImport,
  serializeCustomThemeExport,
} from "./customThemeTransfer";

const theme: CustomThemeInput = {
  name: "Violeta nocturno",
  base: "dark",
  overrides: { brand: "#7c3aed", "pill-category": "#123456" },
  headerBackground: { kind: "none" },
  voxBackground: {
    kind: "gradient",
    type: "linear",
    angleDeg: 135,
    stops: [
      { color: "#0b0614", pos: 0 },
      { color: "#2e1065", pos: 100 },
    ],
  },
};

const fileWith = (patch: Record<string, unknown>) =>
  JSON.stringify({ ...JSON.parse(serializeCustomThemeExport(theme)), ...patch });

describe("theme export and import", () => {
  it("round-trips the theme", () => {
    expect(parseCustomThemeImport(serializeCustomThemeExport(theme))).toEqual({
      ok: true,
      input: theme,
      sharedImage: null,
    });
  });

  it("older files without a header background still import with the base value", () => {
    const legacy = JSON.parse(serializeCustomThemeExport(theme));
    delete legacy.headerBackground;
    expect(parseCustomThemeImport(JSON.stringify(legacy))).toEqual({
      ok: true,
      input: { ...theme, headerBackground: { kind: "none" } },
      sharedImage: null,
    });
  });

  it("exports images as an opaque reference, never an assetId or URL", () => {
    const withImage: CustomThemeInput = {
      ...theme,
      voxBackground: { kind: "image", assetId: "classet1", fit: "cover", dimPct: 40 },
    };
    const shareId = "A".repeat(32);
    const exported = JSON.parse(serializeCustomThemeExport(withImage, shareId));
    expect(exported.voxBackground).toEqual({
      kind: "sharedImage",
      shareId,
      fit: "cover",
      dimPct: 40,
    });
    expect(JSON.stringify(exported)).not.toContain("classet1");
    expect(JSON.stringify(exported)).not.toContain("http");
  });

  it("omits the image without a safe reference", () => {
    const withImage: CustomThemeInput = {
      ...theme,
      voxBackground: { kind: "image", assetId: "classet1", fit: "cover", dimPct: 40 },
    };
    expect(JSON.parse(serializeCustomThemeExport(withImage)).voxBackground).toEqual({
      kind: "none",
    });
  });

  it("a hand-made file with an image imports without the image", () => {
    const result = parseCustomThemeImport(
      fileWith({ voxBackground: { kind: "image", assetId: "ajena123", fit: "cover", dimPct: 0 } }),
    );
    expect(result).toEqual({
      ok: true,
      input: { ...theme, voxBackground: { kind: "none" } },
      sharedImage: null,
    });
  });

  it("accepts a strict shared reference and separates it from editable data", () => {
    const shareId = "b".repeat(32);
    const result = parseCustomThemeImport(
      fileWith({ voxBackground: { kind: "sharedImage", shareId, fit: "contain", dimPct: 55 } }),
    );
    expect(result).toEqual({
      ok: true,
      input: { ...theme, voxBackground: { kind: "none" } },
      sharedImage: { kind: "sharedImage", shareId, fit: "contain", dimPct: 55 },
    });
  });

  it.each([
    ["no JSON", "{"],
    ["array", "[]"],
    ["otro formato", fileWith({ format: "otro" })],
    ["versión futura", fileWith({ version: 2 })],
    ["campo extra", fileWith({ css: "body{}" })],
    ["color no hex", fileWith({ overrides: { brand: "red" } })],
    ["url en color", fileWith({ overrides: { brand: "url(javascript:alert(1))" } })],
    ["clave desconocida", fileWith({ overrides: { "--brand": "#ffffff" } })],
    ["__proto__", fileWith({ overrides: JSON.parse('{"__proto__":"#ffffff"}') })],
    ["base inválida", fileWith({ base: "sepia" })],
    ["nombre vacío", fileWith({ name: "   " })],
    ["nombre con bidi", fileWith({ name: `a${String.fromCodePoint(0x202e)}b` })],
    [
      "shareId corto",
      fileWith({
        voxBackground: { kind: "sharedImage", shareId: "abc", fit: "cover", dimPct: 30 },
      }),
    ],
    [
      "URL como shareId",
      fileWith({
        voxBackground: {
          kind: "sharedImage",
          shareId: "https://ejemplo.invalid/imagen",
          fit: "cover",
          dimPct: 30,
        },
      }),
    ],
    [
      "campo extra en imagen",
      fileWith({
        voxBackground: {
          kind: "sharedImage",
          shareId: "c".repeat(32),
          fit: "cover",
          dimPct: 30,
          url: "https://evil.invalid",
        },
      }),
    ],
  ])("rechaza %s", (_label, text) => {
    const result = parseCustomThemeImport(text);
    expect(result.ok).toBe(false);
  });

  it("rejects oversized files before parsing", () => {
    const huge = fileWith({ name: "x".repeat(CUSTOM_THEME_IMPORT_MAX_BYTES) });
    expect(parseCustomThemeImport(huge)).toEqual({
      ok: false,
      message: "El archivo es demasiado grande para ser un tema.",
    });
  });

  it("never throws on any input and whatever it accepts matches the schema", () => {
    fc.assert(
      fc.property(fc.oneof(fc.string(), fc.json()), (text) => {
        const result = parseCustomThemeImport(text);
        if (result.ok) expect(customThemeInputSchema.safeParse(result.input).success).toBe(true);
      }),
    );
  });

  it("builds a safe, readable file name", () => {
    expect(customThemeExportFileName("Violeta nocturno")).toBe("voxer-tema-violeta-nocturno.json");
    expect(customThemeExportFileName("Café ☕ / ../..")).toBe("voxer-tema-cafe.json");
    expect(customThemeExportFileName("☕☕")).toBe("voxer-tema-personalizado.json");
  });
});
