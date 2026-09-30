"use client";

import { ChevronDown, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  titleCount: number | null;
  commentsLoading: boolean;
  pendingNewCount: number;
  instantLive: boolean;
  onToggleInstantLive: () => void;
  onRevealPending: () => void;
  onOpenMediaGallery: () => void;
  onScrollToOldestComment: () => void;
};

export const VoxDetailCommentsToolbar = ({
  titleCount,
  commentsLoading,
  pendingNewCount,
  instantLive,
  onToggleInstantLive,
  onRevealPending,
  onOpenMediaGallery,
  onScrollToOldestComment,
}: Props) => {
  const countLabel = commentsLoading || titleCount === null ? "…" : `(${titleCount})`;

  const showNewBadge = !instantLive && pendingNewCount > 0;

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-fg/10 bg-surface-toolbar px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold tracking-tight text-fg sm:text-lg">
          Comentarios <span className="tabular-nums text-fg/90">{countLabel}</span>
        </h2>
        {showNewBadge ? (
          <button
            type="button"
            className="shrink-0 cursor-pointer rounded-md bg-brand-600/45 px-2 py-0.5 text-xs font-semibold tabular-nums text-fg shadow-sm hover:bg-brand-600/65"
            onClick={onRevealPending}
          >
            + {pendingNewCount}
          </button>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg outline-none transition-colors hover:bg-fg/10 focus-visible:ring-2 focus-visible:ring-brand-500/80"
          title={
            instantLive
              ? "Mostrar nuevos comentarios al instante (activado)"
              : "Acumular nuevos comentarios hasta pulsar +N (activado)"
          }
          aria-label={
            instantLive
              ? "Modo en vivo: nuevos comentarios visibles al instante"
              : "Modo diferido: nuevos comentarios en badge hasta revisarlos"
          }
          aria-pressed={instantLive}
          onClick={onToggleInstantLive}
        >
          <span
            className={cn(
              "size-3 shrink-0 rounded-full border border-fg/25 transition-colors",
              instantLive
                ? "bg-brand-500 shadow-[0_0_0_1px_color-mix(in_srgb,var(--glow)_35%,transparent)]"
                : "bg-fg",
            )}
          />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 cursor-pointer rounded-md text-fg hover:bg-fg/10 hover:text-fg"
          title="Multimedia en comentarios"
          aria-label="Ver multimedia de los comentarios"
          onClick={onOpenMediaGallery}
        >
          <Folder className="size-[18px]" strokeWidth={2} aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 cursor-pointer rounded-md text-fg hover:bg-fg/10 hover:text-fg"
          title="Ir al primer comentario (más antiguo)"
          aria-label="Ir al primer comentario del hilo"
          onClick={onScrollToOldestComment}
        >
          <ChevronDown className="size-[18px]" strokeWidth={2} aria-hidden />
        </Button>
      </div>
    </div>
  );
};
