"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store";
import { readAndroidVoxNotificationsBridge } from "@/features/native/androidBridge";
import { useDocumentVisible } from "@/hooks/device/useDocumentVisible";

/**
 * In the Android app an open vox removes its system notifications once nothing of it is left to see
 * (`caughtUp`). The unread counters re-run it when a push arrives while the vox is open, and returning
 * to the app covers those that arrived in the background.
 */
export const useClearNativeVoxNotifications = (voxId: string, caughtUp: boolean) => {
  const unread = useAuthStore(
    (s) => (s.user?.unreadNotifications ?? 0) + (s.user?.unreadModerationNotifications ?? 0),
  );
  const documentVisible = useDocumentVisible();

  useEffect(() => {
    if (!caughtUp || !documentVisible) return;
    readAndroidVoxNotificationsBridge(window)?.clearVoxNotifications(voxId);
  }, [voxId, unread, caughtUp, documentVisible]);
};
