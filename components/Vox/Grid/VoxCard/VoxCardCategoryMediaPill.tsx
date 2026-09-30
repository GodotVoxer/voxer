"use client";
import { CategoryLink } from "@/components/Vox/CategoryLink";
import type { MediaType } from "@/lib/vox/types";
import { voxCardTopPillShellLayoutClass } from "@/features/vox/grid/cardTopPillLayout";
import { cn } from "@/lib/utils";
import { Pin, Play, Sparkles } from "lucide-react";

type Props = {
  category: string;
  mediaType: MediaType;
  /** GIF stored as MP4: viewers see an image, so there is no play icon. */
  animatedImage?: boolean;
  showNew: boolean;
  /** Staff: vox pinned at the top of the list (same slot as "Nuevo"). */
  showPinned?: boolean;
};

export const VoxCardCategoryMediaPill = ({
  category,
  mediaType,
  animatedImage = false,
  showNew,
  showPinned = false,
}: Props) => {
  const showYoutube = mediaType === "YOUTUBE";
  const showUploadedVideo = mediaType === "UPLOADED_VIDEO" && !animatedImage;
  const showVideo = showYoutube || showUploadedVideo;

  return (
    <div
      className={cn(
        "inline-flex max-w-full min-w-0 items-stretch overflow-hidden rounded-full",
        voxCardTopPillShellLayoutClass,
      )}
    >
      <CategoryLink
        category={category}
        className={cn(
          "pointer-events-auto flex h-full min-w-0 max-w-[8rem] shrink items-center truncate px-2 font-mono tracking-wide text-on-media no-underline sm:max-w-[10rem]",
          "bg-pill-category hover:brightness-110 hover:no-underline",
        )}
      />
      {showVideo ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none flex h-full min-h-0 shrink-0 items-center justify-center px-1.5",
            showYoutube ? "bg-pill-youtube" : "bg-media-chip ring-1 ring-inset ring-on-media/10",
          )}
          title={showYoutube ? "YouTube" : "Video"}
        >
          <Play className="size-3 fill-on-media text-on-media" strokeWidth={0} />
        </div>
      ) : null}
      {showPinned ? (
        <div
          className="pointer-events-none flex h-full min-h-0 shrink-0 items-center justify-center bg-pill-pinned px-1.5 text-on-media"
          title="Pineado"
        >
          <Pin className="size-3 shrink-0 fill-none text-on-media" strokeWidth={2.25} aria-hidden />
          <span className="sr-only">Pineado</span>
        </div>
      ) : showNew ? (
        <div
          className="pointer-events-none flex h-full min-h-0 shrink-0 items-center justify-center bg-pill-new px-1.5 text-on-media"
          title="Nuevo"
        >
          <Sparkles className="size-3 shrink-0 text-on-media" strokeWidth={2.25} aria-hidden />
          <span className="sr-only">Nuevo</span>
        </div>
      ) : null}
    </div>
  );
};
