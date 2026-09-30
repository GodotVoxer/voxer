import {
  GRADIENT_STOPS_MIN,
  HEADER_GRADIENT_STOPS_MAX,
  HEX_COLOR_RE,
} from "@/lib/theme/customTheme";

const isHexColor = (value: unknown): value is string =>
  typeof value === "string" && HEX_COLOR_RE.test(value);

const isIntInRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

/** Builds the header background from closed data; never accepts CSS from the client. */
export const headerBackgroundCss = (background: unknown): string | null => {
  if (!background || typeof background !== "object") return null;
  const bg = background as Record<string, unknown>;
  if (bg.kind === "none") return null;
  if (bg.kind === "solid") return isHexColor(bg.color) ? bg.color : null;
  if (bg.kind !== "gradient" || !Array.isArray(bg.stops)) return null;
  if (bg.stops.length < GRADIENT_STOPS_MIN || bg.stops.length > HEADER_GRADIENT_STOPS_MAX) {
    return null;
  }
  const parts: string[] = [];
  let previous = -1;
  for (const stop of bg.stops as unknown[]) {
    if (!stop || typeof stop !== "object") return null;
    const { color, pos } = stop as Record<string, unknown>;
    if (!isHexColor(color) || !isIntInRange(pos, 0, 100) || pos < previous) return null;
    previous = pos;
    parts.push(`${color} ${pos}%`);
  }
  if (bg.type === "linear" && isIntInRange(bg.angleDeg, 0, 359)) {
    return `linear-gradient(${bg.angleDeg}deg, ${parts.join(", ")})`;
  }
  if (bg.type === "radial") return `radial-gradient(circle at center, ${parts.join(", ")})`;
  return null;
};
