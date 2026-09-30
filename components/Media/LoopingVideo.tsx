"use client";

import { useMediaViewerOpener } from "@/hooks/media/useMediaViewerOpener";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  /** First frame, shown while the MP4 loads like a GIF not decoded yet. */
  posterUrl?: string | null;
  className?: string;
  wrapperClassName?: string;
  alt?: string;
};

/**
 * A GIF stored as MP4, played by itself, looped, muted and without controls, like a GIF. `muted`
 * enables autoplay in Chrome, Safari and the Android WebView; `playsInline` keeps iOS from going
 * fullscreen. `data-download-video` feeds the Android app's long-press, which cannot see `<video>`.
 */
export const LoopingVideo = ({ src, posterUrl, className, wrapperClassName, alt }: Props) => {
  const openMediaViewer = useMediaViewerOpener();
  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-block max-w-full rounded-md align-top outline-none focus-visible:ring-2 focus-visible:ring-brand-500/80",
        wrapperClassName,
      )}
      title="Ver animación"
      data-download-video={src}
      onClick={(e) => openMediaViewer(e, { src, kind: "loop", posterUrl, alt })}
    >
      <video
        src={src}
        poster={posterUrl?.trim() || undefined}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        controls={false}
        disablePictureInPicture
        className={className}
        aria-label={alt?.trim() || "Animación"}
      />
    </a>
  );
};
