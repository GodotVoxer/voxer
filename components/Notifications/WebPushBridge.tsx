"use client";

import { useWebPushBridge } from "@/hooks/device/useWebPushBridge";

/** Desktop notifications: re-registers the subscription and handles notification clicks. */
export const WebPushBridge = () => {
  useWebPushBridge();
  return null;
};
