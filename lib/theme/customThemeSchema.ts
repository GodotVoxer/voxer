import { z } from "zod";
import {
  CUSTOM_THEME_BASES,
  CUSTOM_THEME_NAME_MAX,
  CUSTOM_THEME_OVERRIDE_KEYS,
  DEFAULT_HEADER_BACKGROUND,
  GRADIENT_STOPS_MAX,
  GRADIENT_STOPS_MIN,
  HEADER_GRADIENT_STOPS_MAX,
  HEX_COLOR_RE,
  THEME_BACKGROUND_FITS,
  THEME_ID_RE,
  VOX_BACKGROUND_DIM_MAX,
  type CustomThemeInput,
  type HeaderBackground,
  type VoxBackground,
} from "@/lib/theme/customTheme";

/**
 * C0/C1 controls, zero-width, bidi marks and BOM would allow misleading or invisible names. Numeric
 * ranges on purpose: the source must not contain those characters ("Trojan Source").
 */
const FORBIDDEN_NAME_CODE_POINTS: readonly (readonly [number, number])[] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2069],
  [0xfeff, 0xfeff],
];

const hasForbiddenNameChar = (name: string): boolean =>
  Array.from(name).some((char) => {
    const codePoint = char.codePointAt(0) ?? 0;
    return FORBIDDEN_NAME_CODE_POINTS.some(([from, to]) => codePoint >= from && codePoint <= to);
  });

const OVERRIDE_KEY_SET: ReadonlySet<string> = new Set(CUSTOM_THEME_OVERRIDE_KEYS);

export const hexColorSchema = z.string().regex(HEX_COLOR_RE, "Color inválido (usá #rrggbb)");

export const customThemeNameSchema = z
  .string()
  .max(CUSTOM_THEME_NAME_MAX * 4)
  .refine((name) => !hasForbiddenNameChar(name), "El nombre tiene caracteres no permitidos")
  .transform((name) => name.trim().replace(/ {2,}/g, " "))
  .pipe(
    z
      .string()
      .min(1, "Poné un nombre")
      .max(CUSTOM_THEME_NAME_MAX, `Máximo ${CUSTOM_THEME_NAME_MAX} caracteres`),
  );

/** Own keys are checked before the record: `JSON.parse` creates `__proto__` as an own key. */
export const customThemeOverridesSchema = z
  .unknown()
  .refine(
    (value) =>
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).every((key) => OVERRIDE_KEY_SET.has(key)),
    "Clave de color desconocida",
  )
  .pipe(z.partialRecord(z.enum(CUSTOM_THEME_OVERRIDE_KEYS), hexColorSchema));

const gradientStopSchema = z
  .object({ color: hexColorSchema, pos: z.number().int().min(0).max(100) })
  .strict();

const orderedGradientSchema = (maxStops: number) =>
  z
    .object({
      kind: z.literal("gradient"),
      type: z.enum(["linear", "radial"]),
      angleDeg: z.number().int().min(0).max(359),
      stops: z.array(gradientStopSchema).min(GRADIENT_STOPS_MIN).max(maxStops),
    })
    .strict()
    .refine((bg) => bg.stops.every((stop, i, all) => i === 0 || stop.pos >= all[i - 1].pos), {
      message: "Las paradas del degradado deben ir en orden",
      path: ["stops"],
    });

export const headerBackgroundSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),
  z.object({ kind: z.literal("solid"), color: hexColorSchema }).strict(),
  orderedGradientSchema(HEADER_GRADIENT_STOPS_MAX),
]) satisfies z.ZodType<HeaderBackground>;

export const voxBackgroundSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }).strict(),
  z.object({ kind: z.literal("solid"), color: hexColorSchema }).strict(),
  orderedGradientSchema(GRADIENT_STOPS_MAX),
  z
    .object({
      kind: z.literal("image"),
      assetId: z.string().regex(THEME_ID_RE, "Imagen inválida"),
      fit: z.enum(THEME_BACKGROUND_FITS),
      dimPct: z.number().int().min(0).max(VOX_BACKGROUND_DIM_MAX),
    })
    .strict(),
]) satisfies z.ZodType<VoxBackground>;

export const customThemeInputSchema = z
  .object({
    name: customThemeNameSchema,
    base: z.enum(CUSTOM_THEME_BASES),
    overrides: customThemeOverridesSchema,
    headerBackground: headerBackgroundSchema.default(DEFAULT_HEADER_BACKGROUND),
    voxBackground: voxBackgroundSchema,
  })
  .strict() satisfies z.ZodType<CustomThemeInput, unknown>;

export const customThemeUpdateSchema = customThemeInputSchema
  .extend({ version: z.number().int().positive() })
  .strict();
