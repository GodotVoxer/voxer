"use client";

import type { MouseEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/features/http/apiClient";
import type { NotificationPanelVirtualRow } from "@/features/notifications/panelVirtualListRow";
import { NotificationPanelVirtualList } from "@/components/Notifications/NotificationPanelVirtualList";
import { DesktopPushToggle } from "@/components/Notifications/DesktopPushToggle";
import { PushDistributorHint } from "@/components/Notifications/PushDistributorHint";

type Props = {
  open: boolean;
  setOpen: (open: boolean) => void;
  loading: boolean;
  clearBusy: boolean;
  isEmpty: boolean;
  virtualRows: NotificationPanelVirtualRow[];
  scrollParentRef: RefObject<HTMLDivElement | null>;
  onRowActivate: (row: NotificationPanelVirtualRow, e: MouseEvent<HTMLAnchorElement>) => void;
  runClearList: (clearRequest: () => Promise<void>) => void;
};

export const NotificationsPanelDialog = ({
  open,
  setOpen,
  loading,
  clearBusy,
  isEmpty,
  virtualRows,
  scrollParentRef,
  onRowActivate,
  runClearList,
}: Props) => (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent className="max-h-[85vh] border-fg/10 sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Notificaciones</DialogTitle>
        <DialogDescription className="text-fg-muted">
          Respuestas a tus comentarios y actividad en vox que seguís o creaste. Tocá una fila para
          abrir el vox y marcar esas notificaciones como vistas; las del mismo vox se marcan juntas.
        </DialogDescription>
      </DialogHeader>
      <div ref={scrollParentRef} className="max-h-[50vh] overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <p className="py-6 text-center text-sm text-fg-subtle">Cargando…</p>
        ) : isEmpty ? (
          <p className="py-6 text-center text-sm text-fg-subtle">No hay notificaciones.</p>
        ) : (
          <NotificationPanelVirtualList
            scrollParentRef={scrollParentRef}
            items={virtualRows}
            onNotificationActivate={onRowActivate}
          />
        )}
      </div>
      <DialogFooter className="flex-col gap-2 sm:flex-col">
        <DesktopPushToggle enabled={open} />
        <PushDistributorHint />
        <Button
          type="button"
          variant="outline"
          disabled={clearBusy || isEmpty}
          className="w-full cursor-pointer border-danger-900/50 bg-surface-raised text-danger-200 hover:bg-danger-950/40 hover:text-fg"
          onClick={() => {
            runClearList(() => api.delete("/notifications"));
          }}
        >
          {clearBusy ? "Limpiando…" : "Limpiar notificaciones"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
