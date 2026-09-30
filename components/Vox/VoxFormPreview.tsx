"use client";
import Image from "next/image";
import { LocalVideoPreview } from "@/components/Media/LocalVideoPreview";
import { VoxCardBottomTitle } from "@/components/Vox/Grid/VoxCard/VoxCardBottomTitle";
import { VoxCardCategoryMediaPill } from "@/components/Vox/Grid/VoxCard/VoxCardCategoryMediaPill";
import { VoxCardRepliesPill } from "@/components/Vox/Grid/VoxCard/VoxCardRepliesPill";
import {
  voxCardFrameRestClassName,
  voxCardInnerShellClassName,
} from "@/features/vox/grid/cardFrameLayout";
import {
  voxCardTopLeftPillSlotClassName,
  voxCardTopOverlaysRowClassName,
} from "@/features/vox/grid/cardTopPillLayout";
import { mediaTypeForVoxFormPreview } from "@/features/vox/create/formPreviewMediaType";
import { cn } from "@/lib/utils";

type Props = {
  thumbnailUrl: string | null;
  title: string;
  category: string;
  isYoutube: boolean;
  isLocalVideo?: boolean;
  hasPoll?: boolean;
  onEmptyPreviewClick?: () => void;
  emptyPreviewDisabled?: boolean;
};

const emptyPreviewClassName =
  "flex aspect-square w-full max-w-[240px] shrink-0 touch-manipulation items-center justify-center rounded border border-dashed border-brand-400/45 bg-surface-raised/90 px-3 text-center text-xs text-brand-100/90 [-webkit-tap-highlight-color:transparent] ring-1 ring-brand-400/35 transition-colors hover:border-brand-300/60 hover:bg-surface-raised hover:ring-brand-300/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:pointer-events-none disabled:opacity-50";

export const VoxFormPreview = ({
  thumbnailUrl,
  title,
  category,
  isYoutube,
  isLocalVideo = false,
  hasPoll = false,
  onEmptyPreviewClick,
  emptyPreviewDisabled = false,
}: Props) => {
  if (!thumbnailUrl) {
    if (onEmptyPreviewClick) {
      return (
        <button
          type="button"
          className={`${emptyPreviewClassName} cursor-pointer`}
          disabled={emptyPreviewDisabled}
          onClick={onEmptyPreviewClick}
          aria-label="Elegí archivo para la portada"
        >
          Tocá acá o usá «Seleccionar archivo» — también podés pegar o arrastrar
        </button>
      );
    }
    return (
      <div className="flex aspect-square w-full max-w-[240px] shrink-0 items-center justify-center rounded border border-dashed border-fg/25 bg-surface-elevated px-3 text-center text-xs text-fg-subtle [-webkit-tap-highlight-color:transparent] ring-2 ring-brand-400/0">
        Elegí archivo o pegá un enlace para ver la preview
      </div>
    );
  }
  const remote = thumbnailUrl.startsWith("http");
  const isBlob = thumbnailUrl.startsWith("blob:");
  const mediaType = mediaTypeForVoxFormPreview({ isYoutube, isLocalVideo });
  return (
    <div className={cn(voxCardFrameRestClassName, "max-w-[240px] shrink-0")}>
      <div className={voxCardInnerShellClassName}>
        <div className="absolute inset-0 bg-media-placeholder">
          {isBlob && isLocalVideo ? (
            <LocalVideoPreview
              src={thumbnailUrl}
              title="Vista previa de video"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : isBlob ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 240px"
              unoptimized={remote}
            />
          )}
        </div>

        <div className={voxCardTopOverlaysRowClassName}>
          <div className={voxCardTopLeftPillSlotClassName}>
            <VoxCardCategoryMediaPill category={category} mediaType={mediaType} showNew={false} />
          </div>
          <VoxCardRepliesPill replies={0} hasPoll={hasPoll} />
        </div>

        <VoxCardBottomTitle
          title={title.trim() || "Sin título"}
          titleStackTopClassName="top-14 sm:top-16"
        />
      </div>
    </div>
  );
};
