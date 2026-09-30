"use client";

import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export const VoxDetailPollSkeleton = () => (
  <div
    className="relative w-full overflow-hidden rounded-lg border border-fg/10 bg-gradient-to-b from-surface-raised/90 to-surface-sunken/85 p-2 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--fg)_4%,transparent)]"
    aria-busy="true"
    aria-label="Cargando encuesta"
  >
    <div
      className="pointer-events-none absolute inset-0 opacity-90 vox-poll-skeleton-sweep"
      style={{
        background:
          "linear-gradient(110deg, transparent 0%, transparent 40%, color-mix(in srgb, var(--fg) 8%, transparent) 50%, transparent 60%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
    />
    <div className="relative space-y-2">
      <div className="mb-1.5 flex items-center gap-1.5">
        <BarChart3 className="size-3.5 shrink-0 text-warning-400/50" aria-hidden />
        <span className="h-3 w-16 rounded bg-surface-strong/80" />
        <span className="ml-auto h-3 w-14 rounded bg-surface-strong/60" />
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-elevated/90 ring-1 ring-inset ring-fg/10">
        {[0.42, 0.28, 0.3].map((grow, i) => (
          <div
            key={i}
            className={cn(
              "min-w-[8px] shrink-0 bg-gradient-to-b opacity-80",
              i === 0 && "from-warning-600/35 to-warning-800/25",
              i === 1 && "from-brand-600/35 to-brand-800/25",
              i === 2 && "from-vivid-600/30 to-vivid-900/25",
            )}
            style={{ flexGrow: grow }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-0.5">
        {[44, 52, 36].map((w, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="size-1.5 shrink-0 rounded-full bg-fg-faint/80" />
            <span className="h-2.5 rounded bg-fg-faint/70" style={{ width: `${w}px` }} />
          </div>
        ))}
      </div>
    </div>
  </div>
);
