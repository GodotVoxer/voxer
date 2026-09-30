"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store";
import { fetchSocketToken } from "@/features/auth/api";
import { listCustomThemesRequest } from "@/features/theme/api";
import { useThemeStore } from "@/features/theme/store";
import {
  prefetchStaffNotificationsPanel,
  prefetchUserNotificationsPanel,
} from "@/features/notifications/prefetchNotificationPanels";
import { acquireRealtimeRoom, type RoomLease } from "@/features/realtime/acquire";
import { realtimePushEnabled } from "@/lib/realtime/mode";
import { isStaffRole } from "@/lib/moderation/roles";

const THEME_UPDATE_DEBOUNCE_MS = 300;

export const UserRealtimeBridge = () => {
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);
  const refresh = useAuthStore((s) => s.refresh);
  const incrementUnread = useAuthStore((s) => s.incrementUnread);
  useEffect(() => {
    if (!realtimePushEnabled()) return;
    if (!userId) return;
    let cancelled = false;
    let teardown: (() => void) | undefined;
    void (async () => {
      let lease: RoomLease | null;
      try {
        // The room JWT expires after 120 s, so it is fetched on every attempt and never kept.
        lease = await acquireRealtimeRoom({
          room: `user:${userId}`,
          getToken: () => fetchSocketToken().catch(() => null),
        });
      } catch {
        return;
      }
      if (!lease) return;
      if (cancelled) {
        lease.release();
        return;
      }
      const room = lease;
      const refreshAfterReconnect = () => {
        void refresh();
      };
      const onNotif = () => {
        incrementUnread();
        void prefetchUserNotificationsPanel(userId);
      };
      const onMod = () => {
        void refresh();
        void prefetchStaffNotificationsPanel(userId);
      };
      // Another tab or device changed the theme: the event carries no data, refetch over HTTP (debounced).
      let themeUpdateTimer: ReturnType<typeof setTimeout> | undefined;
      const onThemeUpdated = () => {
        clearTimeout(themeUpdateTimer);
        themeUpdateTimer = setTimeout(() => {
          void refresh();
          if (useThemeStore.getState().customThemes === null) return;
          listCustomThemesRequest().then(
            (themes) => {
              if (!cancelled) useThemeStore.getState().setCustomThemes(themes);
            },
            () => undefined,
          );
        }, THEME_UPDATE_DEBOUNCE_MS);
      };
      const staff = isStaffRole(role);

      room.onReconnect(refreshAfterReconnect);
      room.on("notification:new", onNotif);
      room.on("user:theme-updated", onThemeUpdated);
      if (staff) room.on("moderation-notification:new", onMod);

      teardown = () => {
        clearTimeout(themeUpdateTimer);
        room.offReconnect(refreshAfterReconnect);
        room.off("user:theme-updated", onThemeUpdated);
        room.off("notification:new", onNotif);
        if (staff) room.off("moderation-notification:new", onMod);
        // Otherwise the previous account's private events would keep arriving after logout.
        room.release();
      };
    })();
    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [userId, role, refresh, incrementUnread]);
  return null;
};
