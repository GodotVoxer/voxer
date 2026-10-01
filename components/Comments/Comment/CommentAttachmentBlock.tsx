"use client";

import { useCallback } from "react";
import { extractYoutubeVideoId, isYoutubeEmbedUrl } from "@/lib/media/youtube";
import { LazyYoutubeEmbed } from "@/components/Media/LazyYoutubeEmbed";
import { LazyNativeVideo } from "@/components/Media/LazyNativeVideo";
import { LoopingVideo } from "@/components/Media/LoopingVideo";
import { useCommentMediaActivity } from "@/components/Comments/Thread/CommentMediaActivity";
import { useMediaViewerOpener } from "@/hooks/media/useMediaViewerOpener";

export const commentThreadMediaClassName =
  "align-top max-h-[min(50vh,400px)] max-w-full w-auto rounded-md border border-fg/10 object-contain sm:max-h-[min(55vh,480px)]";

type Props = {
  /** With an id, the virtualized thread keeps this row mounted while its video plays. */
  commentId?: string;
  imageUrl: string | null;
  videoUrl: string | null;
  /** Poster frame for a native video (same aspect ratio as the video). */
  videoPosterUrl?: string | null;
  /** `videoUrl` is a GIF converted to MP4: looped without controls, not a poster with a play button. */
  animatedImage?: boolean;
  /** Tailwind classes for the media wrapper (width, max-height, etc.). */
  mediaClassName?: string;
};

export const CommentAttachmentBlock = ({
  commentId,
  imageUrl,
  videoUrl,
  videoPosterUrl = null,
  animatedImage = false,
  mediaClassName = commentThreadMediaClassName,
}: Props) => {
  const youtubeId =
    videoUrl && isYoutubeEmbedUrl(videoUrl) ? extractYoutubeVideoId(videoUrl) : null;
  const activity = useCommentMediaActivity();
  const openMediaViewer = useMediaViewerOpener();

  const onPlayerOpenChange = useCallback(
    (open: boolean) => {
      if (commentId) activity?.setCommentMediaOpen(commentId, open);
    },
    [activity, commentId],
  );

  return (
    <>
      {imageUrl ? (
        <a
          href={imageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block max-w-full rounded-md align-top outline-none focus-visible:ring-2 focus-visible:ring-brand-500/80"
          title="Ver imagen"
          onClick={(e) => openMediaViewer(e, { src: imageUrl, kind: "image" })}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" decoding="async" className={mediaClassName} />
        </a>
      ) : null}
      {youtubeId ? (
        <LazyYoutubeEmbed
          videoId={youtubeId}
          title="Video de YouTube en comentario"
          onPlayerOpenChange={onPlayerOpenChange}
        />
      ) : null}
      {videoUrl && !youtubeId && animatedImage ? (
        <LoopingVideo src={videoUrl} posterUrl={videoPosterUrl} className={mediaClassName} />
      ) : null}
      {videoUrl && !youtubeId && !animatedImage ? (
        <LazyNativeVideo
          videoSrc={videoUrl}
          posterUrl={videoPosterUrl?.trim() || null}
          mediaClassName={mediaClassName}
          onPlayerOpenChange={onPlayerOpenChange}
        />
      ) : null}
    </>
  );
};
