"use client";

import { Loader2 } from "lucide-react";

/** Height reserved below the virtualized grid (py-6 plus one line). */
export const VOX_GRID_LOAD_MORE_INDICATOR_BLOCK_PX = 56;

export const VoxGridLoadMoreIndicator = () => (
  <div
    role="status"
    aria-live="polite"
    className="flex w-full items-center justify-center gap-2 py-6 text-sm text-fg-muted"
  >
    <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
    <span>Cargando más vox…</span>
  </div>
);
