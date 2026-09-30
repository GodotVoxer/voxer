"use client";

import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CommentGalleryItem } from "@/features/comments/galleryItems";
import { useMediaViewerOpener } from "@/hooks/media/useMediaViewerOpener";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommentGalleryItem[];
};

const itemKey = (item: CommentGalleryItem, index: number) => {
  if (item.kind === "image") return `img-${item.url}`;
  if (item.kind === "video_upload") return `vup-${item.url}`;
  return `yt-${item.openUrl}-${index}`;
};

export const VoxDetailCommentMediaGalleryDialog = ({ open, onOpenChange, items }: Props) => {
  const openMediaViewer = useMediaViewerOpener();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose
        className="max-h-[min(90vh,720px)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <div className="relative border-b border-fg/10 px-5 pb-3 pt-5">
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="text-fg">Multimedia en comentarios</DialogTitle>
            <DialogDescription className="text-fg-muted">
              Imágenes, GIF y videos de este hilo.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="relative max-h-[min(70vh,560px)] overflow-y-auto px-5 pb-5 pt-4">
          {items.length === 0 ? (
            <p className="py-8 text-center text-sm text-fg-subtle">
              No hay multimedia en los comentarios de este vox.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((item, index) => {
                if (item.kind === "image") {
                  return (
                    <button
                      key={itemKey(item, index)}
                      type="button"
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border border-fg/10 bg-media-scrim/30 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/80"
                      title="Ver imagen"
                      onClick={(e) => {
                        if (openMediaViewer(e, { src: item.url, kind: "image" })) return;
                        window.open(item.url, "_blank", "noopener,noreferrer");
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt=""
                        className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  );
                }
                if (item.kind === "video_upload") {
                  return (
                    <button
                      key={itemKey(item, index)}
                      type="button"
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border border-fg/10 bg-media-scrim/40 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/80"
                      title={item.animatedImage ? "Ver animación" : "Abrir video en pestaña nueva"}
                      onClick={(e) => {
                        if (!item.animatedImage) {
                          window.open(item.url, "_blank", "noopener,noreferrer");
                          return;
                        }
                        const opened = openMediaViewer(e, {
                          src: item.url,
                          kind: "loop",
                          posterUrl: item.posterUrl,
                        });
                        if (!opened) window.open(item.url, "_blank", "noopener,noreferrer");
                      }}
                    >
                      {item.animatedImage ? (
                        // A converted GIF animates in the thumbnail grid like a GIF would, and has no play icon.
                        <video
                          src={item.url}
                          poster={item.posterUrl ?? undefined}
                          className="pointer-events-none size-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="none"
                          aria-hidden
                        />
                      ) : (
                        <>
                          {item.posterUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.posterUrl}
                              alt=""
                              className="pointer-events-none size-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="pointer-events-none size-full bg-media-scrim/50" />
                          )}
                          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-media-scrim/35 transition-colors group-hover:bg-media-scrim/25">
                            <Play
                              className="size-11 shrink-0 text-on-media drop-shadow-md"
                              strokeWidth={1.25}
                              fill="currentColor"
                              aria-hidden
                            />
                          </span>
                        </>
                      )}
                    </button>
                  );
                }
                return (
                  <button
                    key={itemKey(item, index)}
                    type="button"
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-md border border-fg/10 bg-media-scrim/30 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/80"
                    title="Abrir en YouTube"
                    onClick={() => {
                      window.open(item.openUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-media-scrim/25 transition-colors group-hover:bg-media-scrim/15">
                      <Play
                        className="size-11 shrink-0 text-on-media drop-shadow-md"
                        strokeWidth={1.25}
                        fill="currentColor"
                        aria-hidden
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
