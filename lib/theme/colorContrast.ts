type LinearRgb = readonly [number, number, number];

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_RE = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/i;
const OKLCH_RE = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/i;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

const srgbToLinear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/** Out-of-gamut sRGB is clipped per channel, good enough to measure contrast. */
const oklchToLinearRgb = (lightness: number, chroma: number, hueDeg: number): LinearRgb => {
  const hue = (hueDeg * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
};

/** Accepts the formats themes use: `#rgb`, `#rrggbb(aa)`, `rgb()` and `oklch()` (alpha ignored). */
export const parseColorToLinearRgb = (value: string): LinearRgb | null => {
  const color = value.trim();
  const hex = HEX_RE.exec(color);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((c) => c + c)
            .join("")
        : hex[1];
    const channel = (offset: number) =>
      srgbToLinear(Number.parseInt(digits.slice(offset, offset + 2), 16) / 255);
    return [channel(0), channel(2), channel(4)];
  }
  const rgb = RGB_RE.exec(color);
  if (rgb) {
    const channels = [rgb[1], rgb[2], rgb[3]].map(Number);
    if (channels.some((c) => c > 255)) return null;
    const [r, g, b] = channels.map((c) => srgbToLinear(c / 255));
    return [r, g, b];
  }
  const oklch = OKLCH_RE.exec(color);
  if (oklch) {
    const lightness = Number(oklch[1]) / (oklch[2] ? 100 : 1);
    return oklchToLinearRgb(lightness, Number(oklch[3]), Number(oklch[4]));
  }
  return null;
};

const relativeLuminance = ([r, g, b]: LinearRgb): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export const contrastRatio = (foreground: string, background: string): number => {
  const fg = parseColorToLinearRgb(foreground);
  const bg = parseColorToLinearRgb(background);
  if (!fg || !bg) {
    throw new Error(`Unsupported color: ${fg ? background : foreground}`);
  }
  const [lighter, darker] = [relativeLuminance(fg), relativeLuminance(bg)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};
