"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store";
import { readAndroidVoxNotificationsBridge } from "@/features/native/androidBridge";

/**
 * In the Android app an open vox removes its system notifications. The unread counters re-run it when a
 * push arrives while the vox is open, and returning to the app covers those that arrived in the background.
 */
export const useClearNativeVoxNotifications = (voxId: string) => {
  const unread = useAuthStore(
    (s) => (s.user?.unreadNotifications ?? 0) + (s.user?.unreadModerationNotifications ?? 0),
  );

  useEffect(() => {
    const clear = () => {
      if (document.visibilityState !== "visible") return;
      readAndroidVoxNotificationsBridge(window)?.clearVoxNotifications(voxId);
    };
    clear();
    document.addEventListener("visibilitychange", clear);
    return () => document.removeEventListener("visibilitychange", clear);
  }, [voxId, unread]);
};
