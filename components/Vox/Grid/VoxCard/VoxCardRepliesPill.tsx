"use client";
import { BarChart3, MessageCircle } from "lucide-react";
import { voxCardTopPillShellLayoutClass } from "@/features/vox/grid/cardTopPillLayout";
import { cn } from "@/lib/utils";

type Props = {
  replies: number;
  hasPoll: boolean;
};

export const VoxCardRepliesPill = ({ replies, hasPoll }: Props) => (
  <span
    className={cn(
      "pointer-events-none inline-flex shrink-0 items-center overflow-hidden rounded-full bg-pill-replies font-mono tabular-nums text-on-media",
      voxCardTopPillShellLayoutClass,
    )}
    aria-label={`${replies} comentarios${hasPoll ? ", con encuesta" : ""}`}
    title={`${replies} comentarios`}
  >
    {hasPoll ? (
      <span
        className="pointer-events-none flex h-full min-h-0 shrink-0 items-center justify-center bg-pill-poll px-1.5 text-on-media"
        title="Encuesta"
        aria-hidden
      >
        <BarChart3 className="size-3 shrink-0 text-on-media" strokeWidth={2.25} />
      </span>
    ) : null}
    <span className="flex h-full items-center px-2.5">
      {replies}
      <MessageCircle className="ml-1 size-3 shrink-0 text-on-media" strokeWidth={2} aria-hidden />
    </span>
  </span>
);
