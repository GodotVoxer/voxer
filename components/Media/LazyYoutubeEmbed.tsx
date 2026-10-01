"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { youtubeThumbnailUrl, youtubeWatchUrl } from "@/lib/media/youtube";
import {
  YOUTUBE_EMBED_IFRAME_SANDBOX,
  youtubeNocookieEmbedSrc,
} from "@/features/media/youtubeIframe";
import { cn } from "@/lib/utils";

type Props = {
  videoId: string;
  title: string;
  frameClassName?: string;
  /** Reports while the player is open (the virtualized thread keeps that row mounted). */
  onPlayerOpenChange?: (open: boolean) => void;
};

const YoutubePlayMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 68 48" className={className} aria-hidden>
    <path
      className="fill-pill-youtube"
      d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55C3.97 2.33 2.27 4.81 1.48 7.74.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z"
    />
    <path className="fill-on-media" d="M45 24 27 14v20" />
  </svg>
);

/** Thumbnail with a play button: the YouTube player is heavy and only loads after a tap. */
export const LazyYoutubeEmbed = ({
  videoId,
  title,
  frameClassName = "rounded-md border border-fg/10 bg-shade",
  onPlayerOpenChange,
}: Props) => {
  const [playing, setPlaying] = useState(false);

  const openChangeRef = useRef(onPlayerOpenChange);
  useEffect(() => {
    openChangeRef.current = onPlayerOpenChange;
  }, [onPlayerOpenChange]);

  useEffect(() => {
    openChangeRef.current?.(playing);
    if (!playing) return;
    return () => openChangeRef.current?.(false);
  }, [playing]);

  return (
    <div className={cn("w-full overflow-hidden", frameClassName)}>
      <div className="relative aspect-video w-full">
        {playing ? (
          <>
            <iframe
              title={title}
              className="absolute inset-0 h-full w-full"
              src={youtubeNocookieEmbedSrc(videoId)}
              sandbox={YOUTUBE_EMBED_IFRAME_SANDBOX}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <button
              type="button"
              className="absolute right-1 top-1 z-10 cursor-pointer rounded-full border border-on-media/15 bg-media-chip/90 p-1.5 text-on-media shadow-md outline-none transition-[background-color,box-shadow,transform] duration-150 hover:border-brand-400/50 hover:bg-media-chip hover:shadow-lg hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand-500/80"
              aria-label="Cerrar reproductor"
              onClick={(e) => {
                e.stopPropagation();
                setPlaying(false);
              }}
            >
              <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="group absolute inset-0 block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/80"
            aria-label={`Reproducir: ${title}`}
            onClick={() => setPlaying(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={youtubeThumbnailUrl(videoId)}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-media-scrim/15 transition-colors group-hover:bg-media-scrim/5">
              <YoutubePlayMark className="h-12 w-[68px] opacity-90 drop-shadow-md transition-[opacity,transform] duration-150 ease-out group-hover:scale-105 group-hover:opacity-100" />
            </span>
          </button>
        )}
      </div>
      <a
        href={youtubeWatchUrl(videoId)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 border-t border-fg/10 bg-surface-raised px-3 py-2 text-sm text-fg-soft outline-none transition-colors hover:bg-surface-elevated hover:text-fg focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/80"
      >
        <YoutubePlayMark className="h-3.5 w-5 shrink-0" />
        Ver en YouTube
        <ExternalLink className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
      </a>
    </div>
  );
};
