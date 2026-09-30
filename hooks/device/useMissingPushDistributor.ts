"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { readAndroidBridge, readNativeAppInfo } from "@/features/native/androidBridge";

const subscribe = (notify: () => void) => {
  document.addEventListener("visibilitychange", notify);
  return () => document.removeEventListener("visibilitychange", notify);
};

const readMissing = (): boolean => {
  const bridge = readAndroidBridge(window);
  if (!bridge) return false;
  const info = readNativeAppInfo(bridge);
  return info?.pushProvider === "unifiedpush" && !info.pushAvailable;
};

/**
 * True in the F-Droid build while no UnifiedPush distributor is installed. Rechecked whenever the user
 * comes back to the app, typically after installing one.
 */
export const useMissingPushDistributor = (): boolean => {
  const missing = useSyncExternalStore(subscribe, readMissing, () => false);
  const wasMissing = useRef(missing);

  useEffect(() => {
    // A distributor was just installed: register now rather than on the next launch.
    if (wasMissing.current && !missing) {
      try {
        readAndroidBridge(window)?.requestPushToken();
      } catch {
        /* an older bridge may fail */
      }
    }
    wasMissing.current = missing;
  }, [missing]);

  return missing;
};
