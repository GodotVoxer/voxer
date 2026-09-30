"use client";

import { useNativeDeepLink } from "@/hooks/device/useNativeDeepLink";
import { useNativeOverlayLock } from "@/hooks/device/useNativeOverlayLock";
import { useNativePushRegistration } from "@/hooks/device/useNativePushRegistration";

/** Bridges with the Android app; all no-ops in a regular browser. */
export const NativeAppBridge = () => {
  useNativePushRegistration();
  useNativeOverlayLock();
  useNativeDeepLink();
  return null;
};
