"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  isMediaSettled,
  recallRenderedBox,
  rememberRenderedBox,
} from "@/features/media/renderedBoxMemory";

type Props = {
  /** Names the media and the place it is rendered in; `null` reserves nothing. */
  memoryId: string | null;
  className?: string;
  children: ReactNode;
};

const layoutViewport = () => ({
  width: window.innerWidth,
  height: document.documentElement.clientHeight,
});

const rememberBox = (memoryId: string, el: HTMLElement) => {
  const { width, height } = el.getBoundingClientRect();
  rememberRenderedBox(memoryId, layoutViewport(), { width, height });
};

/**
 * Wrapper that comes back with the size its media had last time, until the media loads again. A
 * virtualized row is mounted anew on every pass, and by then the browser may have dropped its image
 * from memory: without the reserved size the row collapses for a moment and the virtualizer moves
 * the scroll twice, once for the collapse and once for the image.
 */
export const RememberedMediaBox = ({ memoryId, className, children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [settled, setSettled] = useState(false);
  const reserved =
    settled || memoryId === null || typeof window === "undefined"
      ? null
      : recallRenderedBox(memoryId, layoutViewport());

  const settleIfLoaded = () => {
    const el = ref.current;
    if (!el || !isMediaSettled(el)) return;
    // A poster already gave the video its size: nothing resizes when the metadata settles it.
    if (memoryId !== null) rememberBox(memoryId, el);
    setSettled(true);
  };

  // Media still in memory is complete before any event: nothing else would release the reserved size.
  useLayoutEffect(settleIfLoaded, [memoryId]);

  useEffect(() => {
    const el = ref.current;
    if (!el || memoryId === null || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (isMediaSettled(el)) rememberBox(memoryId, el);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [memoryId]);

  return (
    <div
      ref={ref}
      className={className}
      style={reserved ? { minWidth: reserved.width, minHeight: reserved.height } : undefined}
      // `load` and `loadedmetadata` do not bubble, but they are captured on the way down.
      onLoadCapture={settleIfLoaded}
      onLoadedMetadataCapture={settleIfLoaded}
      onErrorCapture={settleIfLoaded}
    >
      {children}
    </div>
  );
};
