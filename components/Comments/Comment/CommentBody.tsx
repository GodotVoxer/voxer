"use client";
import { Fragment } from "react";
import type { CommentPublic } from "@/lib/vox/types";
import { CommentHoverPreview } from "@/components/Comments/Overlays/CommentHoverPreview";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useCanHover } from "@/hooks/device/useCanHover";
import {
  linkStyleAnchorClass,
  renderLinkTextBits,
} from "@/components/Comments/Comment/RichGreentextLinkBlock";
import { shouldShowRefHoverPreview } from "@/features/comments/bodyRefHover";
import { COMMENT_REPLY_TOKEN_RE } from "@/lib/comments/replies";
import { isGreentextLine } from "@/features/comments/greentext";

type Props = {
  text: string;
  onRefClick: (tag: string) => void;
  /** In previews: render >>TAG as text without a button. */
  tagsAsPlainText?: boolean;
  /** When set and the tag exists in the thread, hovering a >> shows a preview (desktop). */
  resolveComment?: (publicTagUpper: string) => CommentPublic | undefined;
  /** Side of the preview relative to the tag (usually left inside dialogs). */
  refHoverPreviewSide?: "left" | "right" | "top" | "bottom";
};

type LineRenderOpts = {
  onRefClick: (tag: string) => void;
  tagsAsPlainText: boolean;
  resolveComment?: (publicTagUpper: string) => CommentPublic | undefined;
  refHoverPreviewSide: "left" | "right" | "top" | "bottom";
  canHover: boolean;
};

const renderLineParts = (line: string, opts: LineRenderOpts) => {
  const { onRefClick, tagsAsPlainText, resolveComment, refHoverPreviewSide, canHover } = opts;
  const parts = line.split(COMMENT_REPLY_TOKEN_RE);
  return parts.flatMap((part, i) => {
    const m = part.match(/^>>([A-Z0-9]{8})$/);
    if (m) {
      const tag = m[1]!;
      if (tagsAsPlainText) {
        return [
          <span key={i} className="font-medium text-brand-400/90">
            {part}
          </span>,
        ];
      }
      const resolved = resolveComment?.(tag);
      const button = (
        <button
          type="button"
          className={linkStyleAnchorClass}
          aria-label={`Ver comentario ${tag}`}
          onClick={() => onRefClick(tag)}
        >
          {part}
        </button>
      );
      if (!shouldShowRefHoverPreview(resolved, tagsAsPlainText, canHover)) {
        return [<Fragment key={i}>{button}</Fragment>];
      }
      return [
        <HoverCard key={i} openDelay={180} closeDelay={100}>
          <HoverCardTrigger asChild>{button}</HoverCardTrigger>
          <HoverCardContent
            side={refHoverPreviewSide}
            align="start"
            className="w-[min(36rem,calc(100vw-2rem))] p-2"
          >
            <CommentHoverPreview comment={resolved!} />
          </HoverCardContent>
        </HoverCard>,
      ];
    }
    return renderLinkTextBits(part, tagsAsPlainText, `${i}`);
  });
};

export const CommentBody = ({
  text,
  onRefClick,
  tagsAsPlainText = false,
  resolveComment,
  refHoverPreviewSide = "right",
}: Props) => {
  const canHover = useCanHover();
  const lines = text.split("\n");
  const lineOpts: LineRenderOpts = {
    onRefClick,
    tagsAsPlainText,
    resolveComment,
    refHoverPreviewSide,
    canHover,
  };
  return (
    <p className="whitespace-pre-wrap break-words text-sm text-fg">
      {lines.map((line, li) => {
        const green = isGreentextLine(line);
        const inner = renderLineParts(line, lineOpts);
        return (
          <Fragment key={li}>
            {li > 0 ? <br /> : null}
            <span className={green ? "text-greentext" : undefined}>{inner}</span>
          </Fragment>
        );
      })}
    </p>
  );
};
