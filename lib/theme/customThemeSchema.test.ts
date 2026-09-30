import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CUSTOM_THEME_OVERRIDE_KEYS, HEX_COLOR_RE } from "./customTheme";
import {
  customThemeInputSchema,
  customThemeNameSchema,
  customThemeOverridesSchema,
  customThemeUpdateSchema,
  hexColorSchema,
  headerBackgroundSchema,
  voxBackgroundSchema,
} from "./customThemeSchema";

/** Special characters built in code: the test source must not contain them raw either. */
const cp = (codePoint: number) => String.fromCodePoint(codePoint);

const validInput = {
  name: "Noche violeta",
  base: "dark",
  overrides: { brand: "#7c3aed", surface: "#0b0614" },
  headerBackground: { kind: "none" },
  voxBackground: {
    kind: "gradient",
    type: "linear",
    angleDeg: 160,
    stops: [
      { color: "#0b0614", pos: 0 },
      { color: "#2e1065", pos: 100 },
    ],
  },
};

describe("hexColorSchema", () => {
  it.each(["#000000", "#abcdef", "#abcdef80"])("accepts %s", (color) => {
    expect(hexColorSchema.safeParse(color).success).toBe(true);
  });

  it.each([
    "#fff",
    "#ABCDEF",
    "#abcdefg",
    "#abcdef8",
    "abcdef",
    `${cp(0xff03)}abcdef`,
    "red",
    "rgb(0 0 0)",
    "var(--fg)",
    "#000000;background:url(javascript:alert(1))",
    "#000000}body{display:none",
    "\\23 000000",
    "expression(alert(1))",
    "#000000 ",
    `#000000${cp(0x0a)}`,
    "",
  ])("rechaza %j", (color) => {
    expect(hexColorSchema.safeParse(color).success).toBe(false);
  });

  it("anything accepted matches the hex format exactly", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 12 }), (value) => {
        const result = hexColorSchema.safeParse(value);
        return !result.success || HEX_COLOR_RE.test(result.data);
      }),
      { numRuns: 3000 },
    );
  });
});

describe("customThemeNameSchema", () => {
  it("accepts normal names with spaces, accents and emoji; trims and collapses spaces", () => {
    expect(customThemeNameSchema.parse("Noche violeta")).toBe("Noche violeta");
    expect(customThemeNameSchema.parse("  Mi   tema  ")).toBe("Mi tema");
    expect(customThemeNameSchema.parse(`Oto${cp(0xf1)}o ${cp(0x1f342)} - v2`)).toBe(
      `Oto${cp(0xf1)}o ${cp(0x1f342)} - v2`,
    );
  });

  it.each([
    ["vacío", ""],
    ["solo espacios", "   "],
    ["demasiado largo", "a".repeat(41)],
    ["override bidi RLO", `tema${cp(0x202e)}oicil`],
    ["isolate bidi", `tema${cp(0x2066)}x${cp(0x2069)}`],
    ["ancho cero", `tema${cp(0x200b)}`],
    ["BOM", `tema${cp(0xfeff)}`],
    ["salto de línea", `tema${cp(0x0a)}nuevo`],
    ["NUL", `tema${cp(0x00)}`],
    ["control C1", `tema${cp(0x85)}`],
  ])("rechaza %s", (_label, name) => {
    expect(customThemeNameSchema.safeParse(name).success).toBe(false);
  });
});

describe("customThemeOverridesSchema", () => {
  it("accepts known keys partially", () => {
    expect(customThemeOverridesSchema.parse({ fg: "#ffffff" })).toEqual({ fg: "#ffffff" });
    expect(customThemeOverridesSchema.parse({})).toEqual({});
  });

  it.each([
    { "--fg": "#ffffff" },
    { glow: "#ffffff" },
    { "pinned-glow": "#000000" },
    { "brand-600": "#ffffff" },
    { fg: "white" },
    JSON.parse('{"__proto__": "#ffffff"}'),
    JSON.parse('{"__proto__": {"polluted": "#ffffff"}}'),
    { constructor: "#ffffff" },
    ["#ffffff"],
    null,
  ])("rechaza %j", (overrides) => {
    expect(customThemeOverridesSchema.safeParse(overrides).success).toBe(false);
  });

  it("accepts every editable key", () => {
    const all = Object.fromEntries(CUSTOM_THEME_OVERRIDE_KEYS.map((k) => [k, "#123456"]));
    expect(customThemeOverridesSchema.safeParse(all).success).toBe(true);
  });
});

describe("voxBackgroundSchema", () => {
  it.each([{ kind: "none" }, { kind: "solid", color: "#101010" }, validInput.voxBackground])(
    "acepta %j",
    (bg) => {
      expect(voxBackgroundSchema.safeParse(bg).success).toBe(true);
    },
  );

  it.each([
    { kind: "solid", color: "#101010", css: "url(x)" },
    { kind: "image", url: "https://evil.example/x.png" },
    { kind: "gradient", type: "linear", angleDeg: 360, stops: validInput.voxBackground.stops },
    { kind: "gradient", type: "linear", angleDeg: 12.5, stops: validInput.voxBackground.stops },
    { kind: "gradient", type: "conic", angleDeg: 0, stops: validInput.voxBackground.stops },
    {
      kind: "gradient",
      type: "linear",
      angleDeg: 0,
      stops: [
        { color: "#000000", pos: 80 },
        { color: "#ffffff", pos: 20 },
      ],
    },
    {
      kind: "gradient",
      type: "linear",
      angleDeg: 0,
      stops: Array.from({ length: 5 }, (_, i) => ({ color: "#000000", pos: i * 20 })),
    },
    {
      kind: "gradient",
      type: "linear",
      angleDeg: 0,
      stops: [
        { color: "#000000", pos: 0, extra: 1 },
        { color: "#ffffff", pos: 100 },
      ],
    },
  ])("rechaza %j", (bg) => {
    expect(voxBackgroundSchema.safeParse(bg).success).toBe(false);
  });
});

describe("headerBackgroundSchema", () => {
  it("accepts up to ten stops to form stripes", () => {
    const stops = Array.from({ length: 10 }, (_, i) => ({
      color: i % 2 === 0 ? "#5bcefa" : "#f5a9b8",
      pos: Math.round((i / 9) * 100),
    }));
    expect(
      headerBackgroundSchema.safeParse({ kind: "gradient", type: "linear", angleDeg: 180, stops })
        .success,
    ).toBe(true);
  });

  it("rejects free CSS and more than ten stops", () => {
    expect(
      headerBackgroundSchema.safeParse({ kind: "solid", color: "url(javascript:alert(1))" })
        .success,
    ).toBe(false);
    expect(
      headerBackgroundSchema.safeParse({
        kind: "gradient",
        type: "linear",
        angleDeg: 180,
        stops: Array.from({ length: 11 }, (_, i) => ({ color: "#ffffff", pos: i * 10 })),
      }).success,
    ).toBe(false);
  });
});

describe("customThemeInputSchema / customThemeUpdateSchema", () => {
  it("accepts a valid theme", () => {
    expect(customThemeInputSchema.parse(validInput)).toEqual(validInput);
    expect(customThemeUpdateSchema.safeParse({ ...validInput, version: 3 }).success).toBe(true);
  });

  it.each([
    { ...validInput, base: "sepia" },
    { ...validInput, customCss: "body{display:none}" },
    { ...validInput, id: "otro" },
    { ...validInput, overrides: undefined },
  ])("rechaza campos extra o inválidos", (input) => {
    expect(customThemeInputSchema.safeParse(input).success).toBe(false);
  });

  it("update requires a positive integer version", () => {
    expect(customThemeUpdateSchema.safeParse({ ...validInput, version: 0 }).success).toBe(false);
    expect(customThemeUpdateSchema.safeParse(validInput).success).toBe(false);
  });
});
