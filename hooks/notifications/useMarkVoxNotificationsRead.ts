"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/features/auth/store";
import { postMarkSeenNotificationsReadForVox } from "@/features/notifications/api";
import {
  shouldMarkVoxNotificationsRead,
  voxNotificationsCaughtUp,
  type VoxReadAttempt,
} from "@/features/notifications/markVoxRead";
import { useDocumentVisible } from "@/hooks/device/useDocumentVisible";

/**
 * While a vox is open, the notifications of the comments the reader has on screen count as read: those
 * present on arrival and those arriving live, but not the ones still behind the "+N" badge or arriving
 * in a hidden tab. Returns whether nothing of the vox is left to see.
 */
export const useMarkVoxNotificationsRead = (
  voxId: string,
  thread: {
    /** Comments finished loading without an error. */
    ready: boolean;
    /** `createdAt` of the newest comment in the thread, `null` when it is empty. */
    seenThrough: string | null;
  },
): boolean => {
  const userId = useAuthStore((s) => s.user?.id);
  const unread = useAuthStore((s) => s.user?.unreadNotifications ?? 0);
  const refresh = useAuthStore((s) => s.refresh);
  const documentVisible = useDocumentVisible();
  const inFlightRef = useRef(false);
  const [lastAttempt, setLastAttempt] = useState<VoxReadAttempt | null>(null);
  const threadOnScreen = thread.ready && documentVisible;
  const { seenThrough } = thread;

  useEffect(() => {
    const decision = shouldMarkVoxNotificationsRead({
      hasSession: Boolean(userId),
      unreadNotifications: unread,
      voxId,
      threadOnScreen,
      seenThrough,
      requestInFlight: inFlightRef.current,
      lastAttempt,
    });
    if (!decision) return;
    inFlightRef.current = true;

    void (async () => {
      try {
        const { marked, remaining } = await postMarkSeenNotificationsReadForVox(voxId, seenThrough);
        // Refetch /auth/me only when the badge actually changed.
        if (marked > 0) await refresh();
        inFlightRef.current = false;
        // Recording the attempt re-runs the effect, which picks up whatever changed meanwhile.
        setLastAttempt({ voxId, unreadNotifications: unread, seenThrough, remaining });
      } catch {
        // The counter realigns on the next /auth/me.
        inFlightRef.current = false;
      }
    })();
  }, [voxId, userId, unread, threadOnScreen, seenThrough, lastAttempt, refresh]);

  return voxNotificationsCaughtUp({ unreadNotifications: unread, voxId, lastAttempt });
};
