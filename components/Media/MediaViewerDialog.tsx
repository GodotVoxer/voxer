"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Minimize2, X } from "lucide-react";
import { useMediaViewerStore } from "@/features/media/mediaViewerStore";
import {
  MEDIA_VIEWER_IDENTITY,
  MEDIA_VIEWER_MIN_SCALE,
  MEDIA_VIEWER_STEP_SCALE,
  clampMediaViewerOffset,
  type MediaViewerTransform,
  zoomMediaViewerAt,
} from "@/features/media/viewerZoom";
import { wheelDeltaPixels } from "@/features/device/wheelDeltaPixels";

/** Minimum drag so lifting the finger does not count as the click that closes the viewer. */
const DRAG_SLOP_PX = 6;

const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** Mounted with a `key` per file, so zoom starts over on every image. */
export const MediaViewerDialog = () => {
  const item = useMediaViewerStore((s) => s.item);
  const closeMediaViewer = useMediaViewerStore((s) => s.closeMediaViewer);

  const stageRef = useRef<HTMLDivElement>(null);
  // The stage lives in a portal that mounts after this component's first effects run, so the wheel
  // listener waits for the node instead of reading the ref once.
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const stageCallbackRef = useCallback((node: HTMLDivElement | null) => {
    stageRef.current = node;
    setStage(node);
  }, []);
  const contentRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<MediaViewerTransform>(MEDIA_VIEWER_IDENTITY);

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const dragMovedRef = useRef(false);

  /** The viewport center is the origin: the content transform is centered too. */
  const focusFromClient = useCallback((clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - (rect.left + rect.width / 2), y: clientY - (rect.top + rect.height / 2) };
  }, []);

  /**
   * Sizes are read here (always from a handler), not inside the updater, which React may run during
   * render. `offsetWidth` is the layout size, unaffected by `transform`.
   */
  const applyTransform = useCallback(
    (compute: (prev: MediaViewerTransform) => MediaViewerTransform) => {
      const stage = stageRef.current;
      const content = contentRef.current;
      const contentSize = {
        width: content?.offsetWidth ?? 0,
        height: content?.offsetHeight ?? 0,
      };
      const viewport = { width: stage?.clientWidth ?? 0, height: stage?.clientHeight ?? 0 };
      setTransform((prev) => clampMediaViewerOffset(compute(prev), contentSize, viewport));
    },
    [],
  );

  // Native `wheel` listener: React registers it as passive, which would not let us stop the
  // browser zoom or the page scroll behind.
  useEffect(() => {
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = wheelDeltaPixels(e, stage.clientHeight);
      const focus = focusFromClient(e.clientX, e.clientY);
      applyTransform((prev) =>
        zoomMediaViewerAt(prev, prev.scale * Math.exp(-delta * 0.0015), focus),
      );
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [stage, applyTransform, focusFromClient]);

  if (!item) return null;

  const zoomed = transform.scale > MEDIA_VIEWER_MIN_SCALE;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragMovedRef.current = false;
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { distance: distanceBetween(a, b), scale: transform.scale };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    const previous = pointers.get(e.pointerId);
    if (!previous) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pinch = pinchRef.current;
    if (pointers.size >= 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const distance = distanceBetween(a, b);
      if (distance <= 0) return;
      dragMovedRef.current = true;
      const focus = focusFromClient((a.x + b.x) / 2, (a.y + b.y) / 2);
      applyTransform((prev) =>
        zoomMediaViewerAt(prev, (pinch.scale * distance) / pinch.distance, focus),
      );
      return;
    }

    const dx = e.clientX - previous.x;
    const dy = e.clientY - previous.y;
    if (Math.abs(dx) > DRAG_SLOP_PX || Math.abs(dy) > DRAG_SLOP_PX) dragMovedRef.current = true;
    applyTransform((prev) =>
      prev.scale <= MEDIA_VIEWER_MIN_SCALE
        ? prev
        : { scale: prev.scale, x: prev.x + dx, y: prev.y + dy },
    );
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) closeMediaViewer();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-shade/85 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          data-slot="media-viewer"
          className="fixed inset-0 z-50 overflow-hidden outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            {item.alt?.trim() || "Multimedia a pantalla completa"}
          </DialogPrimitive.Title>

          <div
            ref={stageCallbackRef}
            className="flex size-full touch-none select-none items-center justify-center overflow-hidden"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClick={(e) => {
              // Releasing a drag does not close the viewer, and the backdrop is the only target of this click.
              if (dragMovedRef.current || e.target !== e.currentTarget) return;
              closeMediaViewer();
            }}
            onDoubleClick={(e) => {
              const focus = focusFromClient(e.clientX, e.clientY);
              applyTransform((prev) =>
                zoomMediaViewerAt(
                  prev,
                  prev.scale > MEDIA_VIEWER_MIN_SCALE
                    ? MEDIA_VIEWER_MIN_SCALE
                    : MEDIA_VIEWER_STEP_SCALE,
                  focus,
                ),
              );
            }}
          >
            <div
              ref={contentRef}
              className="max-h-full max-w-full will-change-transform"
              style={{
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
                cursor: zoomed ? "grab" : "zoom-in",
              }}
            >
              {item.kind === "loop" ? (
                <video
                  src={item.src}
                  poster={item.posterUrl?.trim() || undefined}
                  className="block max-h-[100dvh] max-w-[100vw] object-contain"
                  autoPlay
                  loop
                  muted
                  playsInline
                  controls={false}
                  disablePictureInPicture
                  aria-label={item.alt?.trim() || "Animación"}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- URLs remotas arbitrarias (R2, enlaces pegados).
                <img
                  src={item.src}
                  alt={item.alt?.trim() || ""}
                  className="block max-h-[100dvh] max-w-[100vw] object-contain"
                  decoding="async"
                  draggable={false}
                />
              )}
            </div>
          </div>

          <div className="pointer-events-none absolute right-0 top-0 flex items-center gap-2 p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
            {zoomed ? (
              <button
                type="button"
                className="pointer-events-auto cursor-pointer rounded-full border border-on-media/15 bg-media-chip/90 p-2 text-on-media shadow-md outline-none transition-[background-color,transform] hover:scale-105 hover:bg-media-chip focus-visible:ring-2 focus-visible:ring-brand-500/80"
                aria-label="Restablecer zoom"
                title="Restablecer zoom"
                onClick={() => setTransform(MEDIA_VIEWER_IDENTITY)}
              >
                <Minimize2 className="size-5 shrink-0" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
            <DialogPrimitive.Close
              className="pointer-events-auto cursor-pointer rounded-full border border-on-media/15 bg-media-chip/90 p-2 text-on-media shadow-md outline-none transition-[background-color,transform] hover:scale-105 hover:bg-media-chip focus-visible:ring-2 focus-visible:ring-brand-500/80"
              aria-label="Cerrar"
              title="Cerrar"
            >
              <X className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
