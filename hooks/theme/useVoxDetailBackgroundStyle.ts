import type { CSSProperties } from "react";
import { useThemeStore } from "@/features/theme/store";
import { useIsMobile } from "@/hooks/device/useMobile";
import { useImageLoadStatus } from "@/hooks/common/useImageLoadStatus";
import { useThemeSafeMode } from "@/hooks/theme/useThemeSafeMode";
import { voxBackgroundStyle } from "@/features/theme/voxBackgroundStyle";

/**
 * Vox detail background: the editor draft, else the active custom theme's; only its owner sees it.
 * Images apply once loaded; until then, or on failure, the theme's background color stays.
 */
export const useVoxDetailBackgroundStyle = (): CSSProperties | undefined => {
  const draftBackground = useThemeStore((s) => s.draft?.voxBackground ?? null);
  const activeTheme = useThemeStore((s) => (s.preference === "custom" ? s.customTheme : null));
  const themeAssets = useThemeStore((s) => s.themeAssets);
  const safeMode = useThemeSafeMode();
  const isMobile = useIsMobile();

  const background = draftBackground ?? activeTheme?.voxBackground ?? null;
  let image: { url: string; urlSm: string } | null = null;
  if (background?.kind === "image") {
    image = draftBackground
      ? (themeAssets?.find((asset) => asset.id === background.assetId) ?? null)
      : (activeTheme?.backgroundImage ?? null);
  }
  const imageUrl = image ? (isMobile ? image.urlSm : image.url) : null;
  const imageStatus = useImageLoadStatus(safeMode ? null : imageUrl);

  if (safeMode || !background) return undefined;
  if (background.kind === "image" && imageStatus !== "loaded") return undefined;
  return voxBackgroundStyle(background, imageUrl);
};
