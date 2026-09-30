import type { CSSProperties } from "react";
import {
  THEME_BACKGROUND_FITS,
  THEME_ID_RE,
  VOX_BACKGROUND_DIM_MAX,
  type ThemeBackgroundFit,
} from "@/lib/theme/customTheme";
import { isSafeThemeImageUrl } from "@/lib/theme/themeAssetUrls";
import { voxBackgroundCss } from "@/lib/theme/voxBackgroundCss";

type ImageBackground = { kind: "image"; assetId: string; fit: ThemeBackgroundFit; dimPct: number };

const isImageBackground = (value: unknown): value is ImageBackground => {
  if (!value || typeof value !== "object") return false;
  const bg = value as Record<string, unknown>;
  return (
    bg.kind === "image" &&
    typeof bg.assetId === "string" &&
    THEME_ID_RE.test(bg.assetId) &&
    typeof bg.fit === "string" &&
    (THEME_BACKGROUND_FITS as readonly string[]).includes(bg.fit) &&
    typeof bg.dimPct === "number" &&
    Number.isInteger(bg.dimPct) &&
    bg.dimPct >= 0 &&
    bg.dimPct <= VOX_BACKGROUND_DIM_MAX
  );
};

/**
 * Inline style for the background over an element that already paints `bg-surface-vox-detail` as a
 * fallback. Assigned through CSSOM (React `style`), never as CSS text; images only with a URL that
 * passes `isSafeThemeImageUrl`, under a veil of the vox background color.
 */
export const voxBackgroundStyle = (
  background: unknown,
  imageUrl?: string | null,
): CSSProperties | undefined => {
  if (isImageBackground(background)) {
    if (!isSafeThemeImageUrl(imageUrl)) return undefined;
    const veil = `color-mix(in srgb, var(--surface-vox-detail) ${background.dimPct}%, transparent)`;
    const size = background.fit === "tile" ? "auto" : background.fit;
    const repeat = background.fit === "tile" ? "repeat" : "no-repeat";
    return {
      backgroundImage: `linear-gradient(${veil}, ${veil}), url("${imageUrl}")`,
      backgroundSize: `auto, ${size}`,
      backgroundRepeat: `no-repeat, ${repeat}`,
      backgroundPosition: "center, center",
    };
  }
  const css = voxBackgroundCss(background);
  if (!css) return undefined;
  return css.startsWith("#") ? { backgroundColor: css } : { backgroundImage: css };
};
