"use client";

import { BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebPushSubscription } from "@/hooks/device/useWebPushSubscription";

/** Enables system notifications in this browser (they arrive even with Voxer closed). */
export const DesktopPushToggle = ({ enabled }: { enabled: boolean }) => {
  const { status, busy, error, enable, disable } = useWebPushSubscription(enabled);

  if (status === "unsupported" || status === "loading") return null;

  if (status === "denied") {
    return (
      <p className="text-xs text-fg-subtle">
        Las notificaciones de Voxer están bloqueadas en este navegador. Podés habilitarlas desde la
        configuración del sitio.
      </p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      {status === "on" ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="w-full cursor-pointer border-fg/10 bg-surface-raised text-fg-muted hover:bg-surface-elevated hover:text-fg"
          onClick={() => void disable()}
        >
          <BellOff className="size-4" />
          {busy ? "Desactivando…" : "Desactivar notificaciones en este navegador"}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          className="w-full cursor-pointer border-brand-900/50 bg-surface-raised text-brand-200 hover:bg-brand-950/40 hover:text-fg"
          onClick={() => void enable()}
        >
          <BellRing className="size-4" />
          {busy ? "Activando…" : "Activar notificaciones en este navegador"}
        </Button>
      )}
      {error && <p className="text-xs text-danger-300">{error}</p>}
    </div>
  );
};
