"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth/store";
import { postMarkNotificationsReadForVox } from "@/features/notifications/api";
import { shouldMarkVoxNotificationsRead } from "@/features/notifications/markVoxRead";

/** While a vox is open its notifications count as read, both those present on arrival and those arriving live. */
export const useMarkVoxNotificationsRead = (voxId: string) => {
  const userId = useAuthStore((s) => s.user?.id);
  const unread = useAuthStore((s) => s.user?.unreadNotifications ?? 0);
  const refresh = useAuthStore((s) => s.refresh);
  const inFlightRef = useRef(false);

  useEffect(() => {
    const decision = shouldMarkVoxNotificationsRead({
      hasSession: Boolean(userId),
      unreadNotifications: unread,
      voxId,
      requestInFlight: inFlightRef.current,
    });
    if (!decision) return;
    inFlightRef.current = true;

    void (async () => {
      try {
        const marked = await postMarkNotificationsReadForVox(voxId);
        // Refetch /auth/me only when the badge actually changed.
        if (marked > 0) await refresh();
      } catch {
        // The counter realigns on the next /auth/me.
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [voxId, userId, unread, refresh]);
};
