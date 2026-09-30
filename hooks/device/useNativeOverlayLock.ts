"use client";

import { useEffect } from "react";
import { readAndroidBridge } from "@/features/native/androidBridge";
import { hasOpenOverlay } from "@/features/native/overlayState";

/**
 * Tells the native app when a dialog or drawer is open. Neither Radix nor `vaul` push a history entry,
 * so without this Android's back button closed the whole app; with it the native side dispatches
 * Escape and the top layer closes. A no-op in regular browsers.
 */
export const useNativeOverlayLock = () => {
  useEffect(() => {
    const bridge = readAndroidBridge(window);
    if (!bridge) return;

    let last: boolean | null = null;
    const sync = () => {
      const open = hasOpenOverlay(document);
      if (open === last) return;
      last = open;
      try {
        bridge.setGestureLock(open);
      } catch {
        /* an older bridge must not break the page */
      }
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "role"],
    });

    return () => {
      observer.disconnect();
      // On unmount the native side must not believe a layer is still open.
      try {
        bridge.setGestureLock(false);
      } catch {
        /* same */
      }
    };
  }, []);
};
