"use client";
import { useCallback, useMemo } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/features/auth/store";
import {
  clearStaffNotifications,
  fetchStaffNotifications,
  postMarkStaffNotificationsReadForVox,
  type StaffNotificationRow,
} from "@/features/moderation/api";
import { useNotificationPanelCacheStore } from "@/features/notifications/panelCacheStore";
import { mapStaffNotificationsToVirtualRows } from "@/features/notifications/panelVirtualListRow";
import { NotificationPanelVirtualList } from "@/components/Notifications/NotificationPanelVirtualList";
import { useVoxPanelBellList } from "@/hooks/notifications/useVoxPanelBellList";
import { sortUnreadFirst } from "@/features/notifications/sortUnreadFirst";
import { isStaffRole } from "@/lib/moderation/roles";

export const ModerationReportsBell = () => {
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refresh);

  const fetchList = useCallback(() => fetchStaffNotifications(), []);

  const readCachedItems = useCallback((ownerId: string) => {
    const c = useNotificationPanelCacheStore.getState().staffByOwner;
    return c?.ownerId === ownerId ? c.items : null;
  }, []);

  const writePanelCache = useCallback((ownerId: string, items: StaffNotificationRow[]) => {
    useNotificationPanelCacheStore.getState().setStaffPanel(ownerId, items);
  }, []);

  const staffEnabled = Boolean(user && isStaffRole(user.role));

  const { open, setOpen, items, loading, clearBusy, scrollParentRef, onRowActivate, runClearList } =
    useVoxPanelBellList<StaffNotificationRow>({
      ownerUserId: user?.id,
      enabled: staffEnabled,
      fetchList,
      readCachedItems,
      writePanelCache,
      postMarkReadForVox: postMarkStaffNotificationsReadForVox,
      refresh,
    });

  const virtualRows = useMemo(
    () => mapStaffNotificationsToVirtualRows(sortUnreadFirst(items)),
    [items],
  );

  if (!user || !isStaffRole(user.role)) return null;
  const n = user.unreadModerationNotifications;
  const badge = n > 9 ? "9+" : String(n);
  return (
    <>
      <div className="relative shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="app-header-control cursor-pointer rounded-md border border-danger-900/45 bg-surface-raised text-danger-500 hover:bg-danger-950/45 hover:text-danger-100"
          aria-label="Denuncias"
          onClick={() => setOpen(true)}
        >
          <Flag className="size-5" />
        </Button>
        {n > 0 && (
          <span className="pointer-events-none absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold leading-none text-on-solid">
            {badge}
          </span>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[85vh] border-fg/10 sm:max-w-md"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Denuncias</DialogTitle>
            <DialogDescription className="text-fg-muted">
              Reportes de usuarios. Tocá una fila para abrir el vox y marcar esas denuncias como
              vistas; las del mismo vox se marcan juntas. Las miniaturas se ven borrosas hasta que
              las tocás.
            </DialogDescription>
          </DialogHeader>
          <div
            ref={scrollParentRef}
            className="max-h-[50vh] overflow-y-auto overscroll-contain pr-1"
          >
            {loading ? (
              <p className="py-6 text-center text-sm text-fg-subtle">Cargando…</p>
            ) : items.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-subtle">No hay denuncias.</p>
            ) : (
              <NotificationPanelVirtualList
                scrollParentRef={scrollParentRef}
                items={virtualRows}
                onNotificationActivate={onRowActivate}
                blurThumbnails
              />
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="button"
              variant="outline"
              disabled={clearBusy || items.length === 0}
              className="w-full cursor-pointer border-danger-900/50 bg-surface-raised text-danger-200 hover:bg-danger-950/40 hover:text-fg"
              onClick={() => {
                runClearList(() => clearStaffNotifications());
              }}
            >
              {clearBusy ? "Limpiando…" : "Limpiar denuncias"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
