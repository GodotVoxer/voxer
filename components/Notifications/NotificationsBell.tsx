"use client";
import dynamic from "next/dynamic";
import { useCallback, useMemo } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/features/http/apiClient";
import { useAuthStore } from "@/features/auth/store";
import {
  useNotificationPanelCacheStore,
  type UserNotificationPanelRow,
} from "@/features/notifications/panelCacheStore";
import { postMarkNotificationsReadForVox } from "@/features/notifications/api";
import { mapUserNotificationsToVirtualRows } from "@/features/notifications/panelVirtualListRow";
import { useVoxPanelBellList } from "@/hooks/notifications/useVoxPanelBellList";
import { useSettingsStore } from "@/features/settings/store";
import { sortUnreadFirst } from "@/features/notifications/sortUnreadFirst";
import { useIdleReady } from "@/hooks/common/useIdleReady";
import { useOpenedOnce } from "@/hooks/common/useOpenedOnce";

const NotificationsPanelDialog = dynamic(
  () =>
    import("@/components/Notifications/NotificationsPanelDialog").then(
      (m) => m.NotificationsPanelDialog,
    ),
  { ssr: false },
);

export const NotificationsBell = () => {
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refresh);

  const fetchList = useCallback(async () => {
    const res = await api.get<{ notifications: UserNotificationPanelRow[] }>("/notifications");
    return res.data.notifications;
  }, []);

  const readCachedItems = useCallback((ownerId: string) => {
    const c = useNotificationPanelCacheStore.getState().userByOwner;
    return c?.ownerId === ownerId ? c.items : null;
  }, []);

  const writePanelCache = useCallback((ownerId: string, items: UserNotificationPanelRow[]) => {
    useNotificationPanelCacheStore.getState().setUserPanel(ownerId, items);
  }, []);

  const { open, setOpen, items, loading, clearBusy, scrollParentRef, onRowActivate, runClearList } =
    useVoxPanelBellList<UserNotificationPanelRow>({
      ownerUserId: user?.id,
      enabled: Boolean(user),
      fetchList,
      readCachedItems,
      writePanelCache,
      postMarkReadForVox: postMarkNotificationsReadForVox,
      refresh,
    });

  const notificationHistoryEnabled = useSettingsStore((s) => s.notificationHistoryEnabled);
  // Without history a read notification is hidden. Filtered here, not on the server, so turning the
  // preference off and on again loses nothing.
  const visibleItems = useMemo(() => {
    const withHistory = notificationHistoryEnabled ? items : items.filter((n) => n.readAt == null);
    return sortUnreadFirst(withHistory);
  }, [items, notificationHistoryEnabled]);

  const virtualRows = useMemo(
    () => mapUserNotificationsToVirtualRows(visibleItems),
    [visibleItems],
  );

  const idle = useIdleReady();
  const opened = useOpenedOnce(open);

  if (!user) return null;
  const n = user.unreadNotifications;
  const badge = n > 9 ? "9+" : String(n);
  return (
    <>
      <div className="relative shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="app-header-control cursor-pointer rounded-md border border-warning-900/40 bg-surface-raised text-warning-100 hover:bg-warning-950/40 hover:text-fg"
          aria-label="Notificaciones"
          onClick={() => setOpen(true)}
        >
          <Bell className="size-5" />
        </Button>
        {n > 0 && (
          <span className="pointer-events-none absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold leading-none text-on-solid">
            {badge}
          </span>
        )}
      </div>

      {idle || opened ? (
        <NotificationsPanelDialog
          open={open}
          setOpen={setOpen}
          loading={loading}
          clearBusy={clearBusy}
          isEmpty={visibleItems.length === 0}
          virtualRows={virtualRows}
          scrollParentRef={scrollParentRef}
          onRowActivate={onRowActivate}
          runClearList={runClearList}
        />
      ) : null}
    </>
  );
};
