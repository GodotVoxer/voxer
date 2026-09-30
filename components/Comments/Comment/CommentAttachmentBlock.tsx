"use client";

import { useCallback, useEffect, useRef } from "react";
import { isYoutubeEmbedUrl } from "@/lib/media/youtube";
import {
  YOUTUBE_EMBED_IFRAME_SANDBOX,
  youtubeEmbedSrcFromUrl,
} from "@/features/media/youtubeIframe";
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
  const ytEmbedSrc =
    videoUrl && isYoutubeEmbedUrl(videoUrl) ? youtubeEmbedSrcFromUrl(videoUrl) : null;
  const activity = useCommentMediaActivity();
  const openMediaViewer = useMediaViewerOpener();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const onPlayerOpenChange = useCallback(
    (open: boolean) => {
      if (commentId) activity?.setCommentMediaOpen(commentId, open);
    },
    [activity, commentId],
  );

  // YouTube runs in a cross-origin iframe that never reports playback, but tapping it takes focus.
  useEffect(() => {
    if (!ytEmbedSrc || !commentId || !activity) return;
    const onWindowBlur = () => {
      if (document.activeElement === iframeRef.current) {
        activity.setCommentMediaOpen(commentId, true);
      }
    };
    window.addEventListener("blur", onWindowBlur);
    return () => {
      window.removeEventListener("blur", onWindowBlur);
      activity.setCommentMediaOpen(commentId, false);
    };
  }, [activity, commentId, ytEmbedSrc]);

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
      {videoUrl && ytEmbedSrc ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-md border border-fg/10 bg-shade">
          <iframe
            ref={iframeRef}
            title="Video de YouTube en comentario"
            className="absolute inset-0 h-full w-full"
            src={ytEmbedSrc}
            sandbox={YOUTUBE_EMBED_IFRAME_SANDBOX}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
      {videoUrl && !ytEmbedSrc && animatedImage ? (
        <LoopingVideo src={videoUrl} posterUrl={videoPosterUrl} className={mediaClassName} />
      ) : null}
      {videoUrl && !ytEmbedSrc && !animatedImage ? (
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
