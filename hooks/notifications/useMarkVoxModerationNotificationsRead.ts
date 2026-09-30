"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/features/auth/store";
import { postMarkStaffNotificationsReadForVox } from "@/features/moderation/api";
import { shouldMarkVoxModerationNotificationsRead } from "@/features/notifications/markVoxModerationRead";
import { isStaffRole } from "@/lib/moderation/roles";

export const useMarkVoxModerationNotificationsRead = (
  voxId: string,
  cameFromReportPush: boolean,
) => {
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refresh);
  const attemptedVoxRef = useRef<string | null>(null);

  useEffect(() => {
    const decision = shouldMarkVoxModerationNotificationsRead({
      cameFromReportPush,
      isStaff: Boolean(user && isStaffRole(user.role)),
      unreadModerationNotifications: user?.unreadModerationNotifications ?? 0,
      voxId,
      alreadyAttempted: attemptedVoxRef.current === voxId,
    });
    if (!decision) return;
    attemptedVoxRef.current = voxId;

    void (async () => {
      try {
        const marked = await postMarkStaffNotificationsReadForVox(voxId);
        if (marked > 0) await refresh();
      } catch {
        attemptedVoxRef.current = null;
      }
    })();
  }, [cameFromReportPush, refresh, user, voxId]);
};
