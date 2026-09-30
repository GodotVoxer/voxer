import { GRADIENT_STOPS_MAX, GRADIENT_STOPS_MIN, HEX_COLOR_RE } from "@/lib/theme/customTheme";

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && HEX_COLOR_RE.test(value);

const isIntInRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

/**
 * Vox background CSS built only from our template and revalidated values (hex and bounded integers).
 * Takes `unknown` on purpose: it also reads local cache data. Anything malformed is null.
 */
export const voxBackgroundCss = (background: unknown): string | null => {
  if (!background || typeof background !== "object") return null;
  const bg = background as Record<string, unknown>;
  if (bg.kind === "solid") {
    return isHexColor(bg.color) ? bg.color : null;
  }
  if (bg.kind !== "gradient" || !Array.isArray(bg.stops)) return null;
  const stops: unknown[] = bg.stops;
  if (stops.length < GRADIENT_STOPS_MIN || stops.length > GRADIENT_STOPS_MAX) return null;
  const parts: string[] = [];
  let previous = -1;
  for (const stop of stops) {
    if (!stop || typeof stop !== "object") return null;
    const { color, pos } = stop as Record<string, unknown>;
    if (!isHexColor(color) || !isIntInRange(pos, 0, 100) || pos < previous) return null;
    previous = pos;
    parts.push(`${color} ${pos}%`);
  }
  if (bg.type === "linear" && isIntInRange(bg.angleDeg, 0, 359)) {
    return `linear-gradient(${bg.angleDeg}deg, ${parts.join(", ")})`;
  }
  if (bg.type === "radial") {
    return `radial-gradient(circle at center, ${parts.join(", ")})`;
  }
  return null;
};
