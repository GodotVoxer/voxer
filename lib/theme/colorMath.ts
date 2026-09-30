import { parseColorToLinearRgb } from "@/lib/theme/colorContrast";
import { THEME_RAMP_STEPS, type ThemeRampStep } from "@/lib/theme/themeTokens";

type LinearRgb = readonly [number, number, number];
type Oklab = readonly [number, number, number];

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

const linearToSrgb = (c: number): number =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

const linearRgbToOklab = ([r, g, b]: LinearRgb): Oklab => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};

/** Out-of-gamut sRGB is clipped per channel. */
const oklabToLinearRgb = ([lightness, a, b]: Oklab): LinearRgb => {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

const toHexByte = (channel01: number): string =>
  Math.round(clamp01(channel01) * 255)
    .toString(16)
    .padStart(2, "0");

const linearRgbToHex = ([r, g, b]: LinearRgb): string =>
  `#${toHexByte(linearToSrgb(r))}${toHexByte(linearToSrgb(g))}${toHexByte(linearToSrgb(b))}`;

/** Normalizes any theme color (`#hex`, `rgb()`, `oklch()`) to lowercase `#rrggbb`, dropping alpha. */
export const cssColorToHex = (value: string): string | null => {
  const linear = parseColorToLinearRgb(value);
  return linear ? linearRgbToHex(linear) : null;
};

/** Perceptual mix in OKLab: `t = 0` returns `from`, `t = 1` returns `to`. */
export const mixCssColors = (from: string, to: string, t: number): string | null => {
  const a = parseColorToLinearRgb(from);
  const b = parseColorToLinearRgb(to);
  if (!a || !b) return null;
  const labA = linearRgbToOklab(a);
  const labB = linearRgbToOklab(b);
  const k = clamp01(t);
  return linearRgbToHex(
    oklabToLinearRgb([
      labA[0] + (labB[0] - labA[0]) * k,
      labA[1] + (labB[1] - labA[1]) * k,
      labA[2] + (labB[2] - labA[2]) * k,
    ]),
  );
};

const RAMP_ANCHOR_STEP = 600;
/** OKLab lightness of Tailwind's `sky` ramp, which shapes derived ramps. */
const RAMP_LIGHTNESS: Record<ThemeRampStep, number> = {
  100: 0.951,
  200: 0.901,
  300: 0.828,
  400: 0.746,
  500: 0.685,
  600: 0.588,
  700: 0.5,
  800: 0.443,
  900: 0.391,
  950: 0.293,
};
const RAMP_CHROMA_FACTOR: Record<ThemeRampStep, number> = {
  100: 0.165,
  200: 0.367,
  300: 0.703,
  400: 1.013,
  500: 1.07,
  600: 1,
  700: 0.848,
  800: 0.696,
  900: 0.57,
  950: 0.418,
};

/**
 * Ten-step ramp from one color: step 600 (solid fills) is exactly that color; lighter and darker steps
 * follow the shape of the `sky` ramp with the same hue.
 */
export const rampFromColor = (color: string): Record<ThemeRampStep, string> | null => {
  const linear = parseColorToLinearRgb(color);
  if (!linear) return null;
  const [anchorL, a, b] = linearRgbToOklab(linear);
  const chroma = Math.hypot(a, b);
  const hue = Math.atan2(b, a);
  const refTop = RAMP_LIGHTNESS[100];
  const refBottom = RAMP_LIGHTNESS[950];
  const anchorRef = RAMP_LIGHTNESS[RAMP_ANCHOR_STEP];
  // When the color is already lighter or darker than the reference ends, move the end so the ramp stays monotonic.
  const top = Math.min(1, Math.max(refTop, anchorL + 0.01));
  const bottom = Math.max(0, Math.min(refBottom, anchorL - 0.05));
  const anchorHex = linearRgbToHex(linear);
  return Object.fromEntries(
    THEME_RAMP_STEPS.map((step) => {
      if (step === RAMP_ANCHOR_STEP) return [step, anchorHex];
      const ref = RAMP_LIGHTNESS[step];
      const lightness =
        ref > anchorRef
          ? anchorL + ((ref - anchorRef) / (refTop - anchorRef)) * (top - anchorL)
          : anchorL - ((anchorRef - ref) / (anchorRef - refBottom)) * (anchorL - bottom);
      const c = chroma * RAMP_CHROMA_FACTOR[step];
      return [
        step,
        linearRgbToHex(oklabToLinearRgb([lightness, c * Math.cos(hue), c * Math.sin(hue)])),
      ];
    }),
  ) as Record<ThemeRampStep, string>;
};

export const oklabLightness = (color: string): number | null => {
  const linear = parseColorToLinearRgb(color);
  return linear ? linearRgbToOklab(linear)[0] : null;
};
