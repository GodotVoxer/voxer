"use client";

import { usePresenceStore } from "@/features/presence/store";

export const SidebarPresenceStatus = () => {
  const onlineCount = usePresenceStore((s) => s.onlineCount);

  return (
    <div
      className="mb-3 flex items-center justify-between rounded-md border border-fg/10 bg-surface/50 px-2.5 py-1.5 text-xs text-fg-muted"
      aria-label={
        onlineCount !== null
          ? `Usuarios conectados en tiempo real: ${onlineCount}`
          : "Conectando al servicio de presencia"
      }
    >
      <span className="inline-flex items-center gap-1.5">
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-success-500" />
        </span>
        <span className="font-medium text-fg-secondary">En línea ahora</span>
      </span>
      <span className="font-semibold tabular-nums text-fg">
        {onlineCount !== null ? (
          onlineCount
        ) : (
          <span className="inline-block h-3 w-4 animate-pulse rounded bg-fg/15" />
        )}
      </span>
    </div>
  );
};
