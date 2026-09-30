"use client";
import { useCallback, type MouseEvent } from "react";
import { useMediaViewerStore, type MediaViewerItem } from "@/features/media/mediaViewerStore";
import { useSettingsStore } from "@/features/settings/store";

/**
 * Click handler for media that opens in a new tab by default. Returns `true` when it took the click
 * (and called `preventDefault`). The preference is read inside the handler, not on render, because it
 * comes from `localStorage` and would make server and client markup differ.
 */
export const useMediaViewerOpener = (): ((
  e: MouseEvent<HTMLElement>,
  item: MediaViewerItem,
) => boolean) => {
  const openMediaViewer = useMediaViewerStore((s) => s.openMediaViewer);

  return useCallback(
    (e, item) => {
      // A modified or middle click explicitly asks for a separate tab.
      if (e.metaKey || e.ctrlKey || e.shiftKey) return false;
      if (useSettingsStore.getState().openImagesInNewTab) return false;
      e.preventDefault();
      openMediaViewer(item);
      return true;
    },
    [openMediaViewer],
  );
};
