"use client";
import type { MediaType } from "@/lib/vox/types";
import { useMediaViewerOpener } from "@/hooks/media/useMediaViewerOpener";
import { LazyNativeVideo } from "@/components/Media/LazyNativeVideo";
import { LoopingVideo } from "@/components/Media/LoopingVideo";
import { extractYoutubeVideoId } from "@/lib/media/youtube";
import { LazyYoutubeEmbed } from "@/components/Media/LazyYoutubeEmbed";
import {
  VOX_DETAIL_MEDIA_IMAGE_CLASS,
  VOX_DETAIL_MEDIA_VIDEO_CLASS,
  VOX_DETAIL_MEDIA_WRAPPER_CLASS,
} from "@/features/vox/detail/mediaLayout";

type Props = {
  mediaType: MediaType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  /** `mediaUrl` is a GIF converted to MP4: looped without controls. */
  animatedImage?: boolean;
  youtubeVideoId: string | null;
  alt: string;
};

export const VoxDetailMedia = ({
  mediaType,
  mediaUrl,
  thumbnailUrl,
  animatedImage = false,
  youtubeVideoId,
  alt,
}: Props) => {
  const openMediaViewer = useMediaViewerOpener();
  const youtubeId =
    youtubeVideoId?.trim() || (mediaUrl ? extractYoutubeVideoId(mediaUrl) : null) || null;

  if (mediaType === "YOUTUBE" && youtubeId) {
    return (
      <LazyYoutubeEmbed
        videoId={youtubeId}
        title={alt}
        frameClassName="rounded-lg border border-fg/10 bg-media-scrim"
      />
    );
  }
  if (mediaType === "UPLOADED_VIDEO" && mediaUrl && animatedImage) {
    return (
      <LoopingVideo
        src={mediaUrl}
        posterUrl={thumbnailUrl}
        alt={alt}
        wrapperClassName={`block w-full max-w-full ${VOX_DETAIL_MEDIA_WRAPPER_CLASS}`}
        className={VOX_DETAIL_MEDIA_VIDEO_CLASS}
      />
    );
  }
  if (mediaType === "UPLOADED_VIDEO" && mediaUrl) {
    return (
      <LazyNativeVideo
        videoSrc={mediaUrl}
        posterUrl={thumbnailUrl?.trim() || null}
        wrapperClassName={`relative block w-full max-w-full ${VOX_DETAIL_MEDIA_WRAPPER_CLASS}`}
        mediaClassName={VOX_DETAIL_MEDIA_VIDEO_CLASS}
      />
    );
  }
  if (mediaType === "IMAGE" && mediaUrl) {
    return (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full max-w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-500/80 ${VOX_DETAIL_MEDIA_WRAPPER_CLASS}`}
        title="Ver imagen"
        onClick={(e) => openMediaViewer(e, { src: mediaUrl, kind: "image", alt })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl} alt={alt} className={VOX_DETAIL_MEDIA_IMAGE_CLASS} decoding="async" />
      </a>
    );
  }
  return (
    <div className="w-full aspect-video rounded-lg bg-surface-raised border border-fg/10 flex items-center justify-center text-fg-subtle text-sm">
      Sin multimedia
    </div>
  );
};
