import { useCallback, useSyncExternalStore } from "react";
import { isSafeThemeImageUrl } from "@/lib/theme/themeAssetUrls";

type ImageLoadStatus = "loading" | "loaded" | "error";

const statuses = new Map<string, ImageLoadStatus>();
const listeners = new Set<() => void>();

const notify = () => {
  for (const listener of listeners) listener();
};

const startLoading = (url: string) => {
  if (statuses.has(url)) return;
  statuses.set(url, "loading");
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    statuses.set(url, "loaded");
    notify();
  };
  image.onerror = () => {
    statuses.set(url, "error");
    notify();
  };
  image.src = url;
};

/**
 * Preloads a theme background image and reports when it is ready. Only URLs passing
 * `isSafeThemeImageUrl`; anything else returns null without a request. Callers keep the fallback
 * color while it loads or if it fails.
 */
export const useImageLoadStatus = (url: string | null | undefined): ImageLoadStatus | null => {
  const safeUrl = isSafeThemeImageUrl(url) ? url : null;
  const subscribe = useCallback(
    (onChange: () => void) => {
      listeners.add(onChange);
      if (safeUrl) startLoading(safeUrl);
      return () => {
        listeners.delete(onChange);
      };
    },
    [safeUrl],
  );
  return useSyncExternalStore(
    subscribe,
    () => (safeUrl ? (statuses.get(safeUrl) ?? "loading") : null),
    () => null,
  );
};
