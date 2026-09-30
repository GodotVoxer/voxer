"use client";
import dynamic from "next/dynamic";
import { useMediaViewerStore } from "@/features/media/mediaViewerStore";

const MediaViewerDialog = dynamic(
  () => import("@/components/Media/MediaViewerDialog").then((m) => m.MediaViewerDialog),
  { ssr: false },
);

/** The viewer downloads on the first image opened and remounts per file, so zoom never carries over. */
export const MediaViewerHost = () => {
  const src = useMediaViewerStore((s) => s.item?.src ?? null);
  if (!src) return null;
  return <MediaViewerDialog key={src} />;
};
