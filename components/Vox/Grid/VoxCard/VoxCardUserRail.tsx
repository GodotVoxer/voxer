"use client";
import type { MouseEvent } from "react";
import { Eye, EyeOff, Flag, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoxListView } from "@/lib/vox/types";

type Props = {
  listView: VoxListView;
  favorited: boolean;
  actionsPinned: boolean;
  onHideToggle: (e: MouseEvent) => void;
  onFavoriteToggle: (e: MouseEvent) => void;
  onReportClick: (e: MouseEvent) => void;
};

export const VoxCardUserRail = ({
  listView,
  favorited,
  actionsPinned,
  onHideToggle,
  onFavoriteToggle,
  onReportClick,
}: Props) => {
  return (
    <div
      className={cn(
        "absolute right-0 top-11 z-[2] flex flex-col gap-0.5 rounded-l-lg rounded-r-none border-y border-l border-on-media/12 border-r-0 bg-media-scrim/38 py-0.5 pl-0.5 pr-0 shadow-md backdrop-blur-md sm:top-12",
        "pointer-events-none opacity-0 transition-opacity duration-150",
        "[@media(hover:hover)]:group-active:pointer-events-auto [@media(hover:hover)]:group-active:opacity-100",
        "max-md:group-hover:pointer-events-auto max-md:group-hover:opacity-100",
        "md:group-hover:pointer-events-auto md:group-hover:opacity-100",
        actionsPinned && "pointer-events-auto opacity-100",
      )}
    >
      <button
        type="button"
        title={listView === "hidden" ? "Mostrar en el inicio" : "Ocultar del inicio"}
        aria-label={listView === "hidden" ? "Mostrar en el inicio" : "Ocultar del inicio"}
        className="flex size-6 cursor-pointer items-center justify-center rounded text-on-media hover:bg-on-media/10 sm:size-7"
        onClick={onHideToggle}
      >
        {listView === "hidden" ? (
          <Eye
            className="size-3.5 shrink-0 fill-none text-on-media sm:size-4"
            strokeWidth={2}
            aria-hidden
          />
        ) : (
          <EyeOff
            className="size-3.5 shrink-0 fill-none text-on-media sm:size-4"
            strokeWidth={2}
            aria-hidden
          />
        )}
      </button>
      <button
        type="button"
        title={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
        aria-label={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
        aria-pressed={favorited}
        className="flex size-6 cursor-pointer items-center justify-center rounded text-media-favorite hover:bg-media-favorite/10 sm:size-7"
        onClick={onFavoriteToggle}
      >
        <Star
          className={cn(
            "size-3.5 shrink-0 stroke-current sm:size-4",
            favorited ? "fill-current" : "fill-none",
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <button
        type="button"
        title="Denunciar"
        aria-label="Denunciar este vox"
        className="flex size-6 cursor-pointer items-center justify-center rounded text-media-danger hover:bg-media-danger/10 sm:size-7"
        onClick={onReportClick}
      >
        <Flag
          className="size-3.5 shrink-0 fill-none text-media-danger sm:size-4"
          strokeWidth={2}
          aria-hidden
        />
      </button>
    </div>
  );
};
