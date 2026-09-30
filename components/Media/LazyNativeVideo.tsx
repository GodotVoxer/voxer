"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { useSettingsStore } from "@/features/settings/store";
import { cn } from "@/lib/utils";

type Props = {
  videoSrc: string;
  posterUrl: string | null;
  /** Same utilities as the final `<video>` (size, border, `object-contain`, ...). */
  mediaClassName?: string;
  /** Poster/player container (e.g. `block w-full` in the vox detail). */
  wrapperClassName?: string;
  /** Without `posterUrl`, sets the placeholder aspect until play. */
  fallbackAspectClassName?: string;
  /** Reports while the player is open (the virtualized thread keeps that row mounted). */
  onPlayerOpenChange?: (open: boolean) => void;
};

export const LazyNativeVideo = ({
  videoSrc,
  posterUrl,
  mediaClassName = "block max-h-[min(50vh,400px)] max-w-full w-auto rounded-md border border-fg/10 object-contain sm:max-h-[min(55vh,480px)]",
  wrapperClassName = "relative inline-block max-w-full align-top",
  fallbackAspectClassName = "aspect-video w-full",
  onPlayerOpenChange,
}: Props) => {
  const [playing, setPlaying] = useState(false);
  const videoSoundEnabled = useSettingsStore((s) => s.videoSoundEnabled);
  /** Poster size on tap: the `<video>` is 300x150 until it has metadata and would shift the layout. */
  const [lockedSize, setLockedSize] = useState<{ width: number; height: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!playing) return;
    const v = videoRef.current;
    if (!v) return;
    void v.play().catch(() => {});
  }, [playing]);

  const openChangeRef = useRef(onPlayerOpenChange);
  useEffect(() => {
    openChangeRef.current = onPlayerOpenChange;
  }, [onPlayerOpenChange]);

  useEffect(() => {
    openChangeRef.current?.(playing);
    if (!playing) return;
    return () => openChangeRef.current?.(false);
  }, [playing]);

  const stop = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    setLockedSize(null);
    setPlaying(false);
  }, []);

  const start = useCallback(() => {
    const rect = posterButtonRef.current?.getBoundingClientRect();
    setLockedSize(
      rect && rect.width > 0 && rect.height > 0 ? { width: rect.width, height: rect.height } : null,
    );
    setPlaying(true);
  }, []);

  return (
    // The Android app reads this attribute on long-press: the WebView does not report `<video>` in its HitTestResult.
    <div className={wrapperClassName} data-download-video={videoSrc}>
      {/* The poster stays mounted during playback: remounting it on close left it at 0 px until the image reloaded. */}
      <button
        ref={posterButtonRef}
        type="button"
        hidden={playing}
        className={cn(
          "group relative block max-w-full cursor-pointer overflow-hidden rounded-md border border-fg/10 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-brand-500/80",
          wrapperClassName.includes("w-full") && "w-full",
          !posterUrl && fallbackAspectClassName,
        )}
        aria-label="Reproducir video"
        onClick={start}
      >
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={posterUrl} alt="" decoding="async" className={cn(mediaClassName, "block")} />
        ) : (
          <div
            className={cn(
              "flex min-h-[8rem] w-full items-center justify-center bg-surface-sunken/25",
              fallbackAspectClassName,
            )}
          />
        )}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Play
            className="size-12 shrink-0 text-on-media/90 drop-shadow-md transition-[color,filter,transform] duration-150 ease-out group-hover:scale-105 group-hover:text-on-media group-hover:drop-shadow-[0_0_14px_color-mix(in_oklab,var(--on-media)_45%,transparent)]"
            strokeWidth={1.25}
            fill="currentColor"
            aria-hidden
          />
        </span>
      </button>
      {playing ? (
        <>
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            loop
            playsInline
            // User preference: the `<video>` mounts on play, so the value applies to this playback and it can be unmuted from the controls.
            muted={!videoSoundEnabled}
            className={mediaClassName}
            style={lockedSize ? { width: lockedSize.width, height: lockedSize.height } : undefined}
            onLoadedMetadata={() => setLockedSize(null)}
          />
          <button
            type="button"
            className="absolute right-1 top-1 z-10 cursor-pointer rounded-full border border-on-media/15 bg-media-chip/90 p-1.5 text-on-media shadow-md outline-none transition-[background-color,box-shadow,transform] duration-150 hover:border-brand-400/50 hover:bg-media-chip hover:shadow-lg hover:scale-105 focus-visible:ring-2 focus-visible:ring-brand-500/80"
            aria-label="Cerrar reproductor"
            onClick={(e) => {
              e.stopPropagation();
              stop();
            }}
          >
            <X className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  );
};
