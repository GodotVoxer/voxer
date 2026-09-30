"use client";

import { useEffect, useRef } from "react";

/** Without `requestVideoFrameCallback` or `timeupdate`, the video is not left running. */
const FIRST_FRAME_TIMEOUT_MS = 1500;

type Props = {
  /** `blob:` URL of the just-picked file, not uploaded yet. */
  src: string;
  className?: string;
  controls?: boolean;
  title?: string;
};

/**
 * Preview of a local video showing its first frame. A `<video>` that never played paints nothing in
 * the Android WebView and mobile Chrome (`preload="auto"` degrades to metadata), so it plays muted and
 * pauses as soon as a frame is presented. `muted` is what allows starting without a user gesture.
 * Pausing on `requestVideoFrameCallback` rather than `seeked` matters: `seeked` only says the time
 * changed, not that the frame is on screen.
 */
export const LocalVideoPreview = ({ src, className, controls = false, title }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = () => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      video.removeEventListener("timeupdate", settle);
      video.pause();
    };

    const forceFirstFrame = () => {
      const withRvfc = video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => number;
      };
      if (typeof withRvfc.requestVideoFrameCallback === "function") {
        withRvfc.requestVideoFrameCallback(settle);
      } else {
        video.addEventListener("timeupdate", settle);
      }
      timer = setTimeout(settle, FIRST_FRAME_TIMEOUT_MS);
      void video.play().catch(() => {
        // Without permission to play, the seek remains, which is enough to paint on desktop.
        if (done) return;
        try {
          video.currentTime = 0.05;
        } catch {
          /* duration still unknown */
        }
      });
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) forceFirstFrame();
    else video.addEventListener("loadedmetadata", forceFirstFrame, { once: true });

    return () => {
      done = true;
      if (timer) clearTimeout(timer);
      video.removeEventListener("loadedmetadata", forceFirstFrame);
      video.removeEventListener("timeupdate", settle);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      key={src}
      src={src}
      title={title}
      muted
      playsInline
      preload="metadata"
      controls={controls}
      disablePictureInPicture
      className={className}
    />
  );
};
