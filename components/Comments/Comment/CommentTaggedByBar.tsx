"use client";
import type { CommentPublic } from "@/lib/vox/types";
import type { CommentTagBackref } from "@/features/comments/backrefs";
import { CommentHoverPreview } from "@/components/Comments/Overlays/CommentHoverPreview";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useCanHover } from "@/hooks/device/useCanHover";
type Props = {
  taggedBy: CommentTagBackref[];
  resolveComment: (publicTagUpper: string) => CommentPublic | undefined;
  onTagClick: (publicTag: string) => void;
  /** Side of the preview relative to the trigger (usually right in the thread). */
  previewSide?: "left" | "right" | "top" | "bottom";
};
export const CommentTaggedByBar = ({
  taggedBy,
  resolveComment,
  onTagClick,
  previewSide = "right",
}: Props) => {
  const canHover = useCanHover();
  if (taggedBy.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] leading-snug text-brand-400/95">
      {taggedBy.map((t, i) => {
        const label = `>>${t.taggerPublicTag}${t.taggerIsOp ? "(OP)" : ""}`;
        const preview = resolveComment(t.taggerPublicTag);
        const button = (
          <button
            type="button"
            className="cursor-pointer font-mono font-medium hover:text-brand-300 hover:underline"
            onClick={() => onTagClick(t.taggerPublicTag)}
          >
            {label}
          </button>
        );
        if (!canHover || !preview) {
          return <span key={`${t.taggerPublicTag}-${i}`}>{button}</span>;
        }
        return (
          <HoverCard key={`${t.taggerPublicTag}-${i}`} openDelay={180} closeDelay={100}>
            <HoverCardTrigger asChild>{button}</HoverCardTrigger>
            <HoverCardContent
              side={previewSide}
              align="start"
              className="w-[min(36rem,calc(100vw-2rem))] p-2"
            >
              <CommentHoverPreview comment={preview} />
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </div>
  );
};
