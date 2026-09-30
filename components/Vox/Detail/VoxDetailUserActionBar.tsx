"use client";
import { Bell, BellOff, Eye, EyeOff, Flag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoxDetailShareButton } from "./VoxDetailShareButton";
import type { VoxDetail } from "@/lib/vox/types";

type Props = {
  vox: VoxDetail;
  followBusy: boolean;
  hideBusy: boolean;
  favoriteBusy: boolean;
  onToggleFollow: () => void;
  onToggleHideFromFeed: () => void;
  onToggleFavorite: () => void;
  onReportVox: () => void;
};

/** Also used by the standalone share button when there is no session and no bar. */
export const compactBtn =
  "w-full min-w-0 justify-center px-2 py-0 max-sm:h-8 max-sm:gap-0 max-sm:px-1.5 max-sm:text-xs sm:w-auto sm:px-3";

export const VoxDetailUserActionBar = ({
  vox,
  followBusy,
  hideBusy,
  favoriteBusy,
  onToggleFollow,
  onToggleHideFromFeed,
  onToggleFavorite,
  onReportVox,
}: Props) => {
  const followLabel = vox.isOwner
    ? vox.following
      ? "Silenciar"
      : "Activar avisos"
    : vox.following
      ? "Dejar de seguir"
      : "Seguir";
  const hideLabel = vox.hidden ? "Mostrar" : "Ocultar";
  const favoriteLabel = vox.favorited ? "Quitar de favoritos" : "Agregar a favoritos";

  return (
    <div className="grid w-full grid-cols-5 gap-1 sm:flex sm:flex-wrap sm:gap-2">
      <VoxDetailShareButton voxId={vox.id} voxTitle={vox.title} className={compactBtn} />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={followBusy}
        aria-label={followLabel}
        aria-pressed={vox.following}
        title={followLabel}
        className={`cursor-pointer border-brand-700/50 bg-surface-raised text-brand-100 hover:bg-brand-950 ${compactBtn}`}
        onClick={onToggleFollow}
      >
        {vox.following ? (
          <Bell className="inline size-4 shrink-0 align-text-bottom sm:mr-1" aria-hidden />
        ) : (
          <BellOff className="inline size-4 shrink-0 align-text-bottom sm:mr-1" aria-hidden />
        )}
        <span className="hidden sm:inline">{followLabel}</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={hideBusy}
        aria-label={hideLabel}
        title={hideLabel}
        className={`cursor-pointer border-fg/20 bg-surface-raised text-fg-soft hover:bg-surface-elevated ${compactBtn}`}
        onClick={onToggleHideFromFeed}
      >
        {vox.hidden ? (
          <Eye className="inline size-4 shrink-0 align-text-bottom sm:mr-1" aria-hidden />
        ) : (
          <EyeOff className="inline size-4 shrink-0 align-text-bottom sm:mr-1" aria-hidden />
        )}
        <span className="hidden sm:inline">{hideLabel}</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={favoriteBusy}
        aria-label={favoriteLabel}
        title={favoriteLabel}
        className={`cursor-pointer border-warning-600/40 bg-surface-raised text-warning-200 hover:bg-warning-950/35 ${compactBtn}`}
        onClick={onToggleFavorite}
      >
        <Star
          className={[
            "inline size-4 shrink-0 align-text-bottom sm:mr-1",
            vox.favorited ? "fill-warning-300 text-warning-200" : "text-warning-200/90",
          ].join(" ")}
          aria-hidden
        />
        <span className="hidden sm:inline">{favoriteLabel}</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-label="Denunciar"
        title="Denunciar"
        className={`cursor-pointer border-danger-900/45 bg-surface-raised text-danger-500 hover:bg-danger-950/45 hover:text-danger-100 ${compactBtn}`}
        onClick={onReportVox}
      >
        <Flag
          className="inline size-4 shrink-0 fill-none align-text-bottom sm:mr-1"
          strokeWidth={2}
          aria-hidden
        />
        <span className="hidden sm:inline">Denunciar</span>
      </Button>
    </div>
  );
};
