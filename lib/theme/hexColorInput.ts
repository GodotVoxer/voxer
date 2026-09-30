import { HEX_COLOR_RE } from "@/lib/theme/customTheme";

/**
 * Normalizes typed or picked colors to lowercase `#rrggbb` / `#rrggbbaa`. Accepts 3, 4, 6 or 8
 * digits with or without `#`; fully opaque alpha is dropped. Anything else is null.
 */
export const normalizeHexColorInput = (raw: string): string | null => {
  const digits = raw.trim().replace(/^#/, "").toLowerCase();
  if (!/^[0-9a-f]+$/.test(digits)) return null;
  let expanded: string;
  if (digits.length === 3 || digits.length === 4) {
    expanded = digits
      .split("")
      .map((d) => d + d)
      .join("");
  } else if (digits.length === 6 || digits.length === 8) {
    expanded = digits;
  } else {
    return null;
  }
  if (expanded.length === 8 && expanded.endsWith("ff")) expanded = expanded.slice(0, 6);
  const color = `#${expanded}`;
  return HEX_COLOR_RE.test(color) ? color : null;
};
