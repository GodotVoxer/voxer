"use client";
import { useState, type RefObject } from "react";
import { ChevronDown, Pin } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CommentRow } from "@/components/Comments/Comment/CommentRow";
import type { CommentPublic } from "@/lib/vox/types";
import type { CommentTagBackref } from "@/features/comments/backrefs";
import { estimateCommentRowHeight } from "@/features/comments/threadEstimate";
import { useThreadVirtualizer } from "@/hooks/comments/useThreadVirtualizer";
import { cn } from "@/lib/utils";
import type { ReplyTagHandler } from "@/components/Comments/Comment/CommentTagButton";

const PINNED_ROW_GAP_PX = 8;

const collapsedStorageKey = (voxId: string) => `vox-pinned-comments-collapsed:${voxId}`;

const readCollapsed = (voxId: string): boolean => {
  try {
    return localStorage.getItem(collapsedStorageKey(voxId)) === "1";
  } catch {
    return false;
  }
};

type Props = {
  voxId: string;
  /** Already sorted, latest pin first. */
  pinned: CommentPublic[];
  scrollParentRef: RefObject<HTMLDivElement | null>;
  /** The page scrolls (mobile) instead of `scrollParentRef`. */
  documentScroll: boolean;
  /** Offset (px) between the start of the scroll and the start of this block; `null` until measured. */
  scrollMargin: number | null;
  taggedByIndex: Map<string, CommentTagBackref[]>;
  repliesByTarget: Map<string, CommentPublic[]>;
  resolveComment: (publicTagUpper: string) => CommentPublic | undefined;
  onReplyTag: ReplyTagHandler;
  onTagClick: (tag: string) => void;
  onOpenReplies: (publicTag: string) => void;
  onReportComment?: (comment: CommentPublic) => void;
  showReportOnComments?: boolean;
  onPinnedChange?: (commentId: string, pinnedAt: string | null) => void;
  onRepliesMutedChange?: (commentId: string, muted: boolean) => void;
  onModeratorDeleteComment?: (comment: CommentPublic) => void;
  onModeratorOpenPublicationModComment?: (comment: CommentPublic) => void;
  moderatorCommentAuthorHistoryHref?: (comment: CommentPublic) => string | undefined;
  showModeratorCommentTools?: boolean;
  onAdminEditComment?: (comment: CommentPublic) => void;
};

/**
 * Copies of the comments the vox owner pinned, above the thread. Virtualized on the thread's scroll
 * (an owner can pin every comment) and collapsed it mounts no rows; the original stays in place.
 */
export const PinnedCommentsSection = ({
  voxId,
  pinned,
  scrollParentRef,
  documentScroll,
  scrollMargin,
  taggedByIndex,
  repliesByTarget,
  resolveComment,
  onReplyTag,
  onTagClick,
  onOpenReplies,
  onReportComment,
  showReportOnComments,
  onPinnedChange,
  onRepliesMutedChange,
  onModeratorDeleteComment,
  onModeratorOpenPublicationModComment,
  moderatorCommentAuthorHistoryHref,
  showModeratorCommentTools,
  onAdminEditComment,
}: Props) => {
  "use no memo";

  const [collapsed, setCollapsed] = useState(() => readCollapsed(voxId));

  const virtualizer = useThreadVirtualizer({
    count: pinned.length,
    documentScroll,
    scrollParentRef,
    scrollMargin,
    estimateSize: (index) => {
      const c = pinned[index];
      const tagUpper = c?.publicTag.toUpperCase() ?? "";
      return estimateCommentRowHeight(
        c,
        taggedByIndex.has(tagUpper) || repliesByTarget.has(tagUpper),
      );
    },
    gap: PINNED_ROW_GAP_PX,
    getItemKey: (index) => `pinned:${pinned[index]?.id ?? index}`,
  });

  if (pinned.length === 0) return null;

  const setOpen = (open: boolean) => {
    setCollapsed(!open);
    try {
      localStorage.setItem(collapsedStorageKey(voxId), open ? "0" : "1");
    } catch {
      /* a convenience preference: nothing happens if it cannot be saved */
    }
  };

  return (
    <Collapsible
      open={!collapsed}
      onOpenChange={setOpen}
      className="mb-2 rounded-md border border-comment-pin/35 bg-comment-pin-soft/[0.04]"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-semibold text-comment-pin">
        <Pin className="size-3.5 shrink-0" aria-hidden />
        <span>Fijados ({pinned.length})</span>
        <ChevronDown
          className={cn(
            "ml-auto size-4 shrink-0 transition-transform duration-200",
            collapsed && "-rotate-90",
          )}
          aria-hidden
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-1.5 pb-2">
          <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((v) => {
              const c = pinned[v.index];
              if (!c) return null;
              return (
                <div
                  key={v.key}
                  data-index={v.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${v.start - (scrollMargin ?? 0)}px)` }}
                >
                  <CommentRow
                    comment={c}
                    voxId={voxId}
                    pinnedCopy
                    onReplyTag={onReplyTag}
                    onTagClick={onTagClick}
                    taggedBy={taggedByIndex.get(c.publicTag.toUpperCase()) ?? []}
                    resolveComment={resolveComment}
                    repliesCount={repliesByTarget.get(c.publicTag.toUpperCase())?.length ?? 0}
                    onOpenReplies={onOpenReplies}
                    onReport={
                      showReportOnComments && onReportComment ? () => onReportComment(c) : undefined
                    }
                    onPinnedChange={onPinnedChange}
                    onRepliesMutedChange={onRepliesMutedChange}
                    onModeratorDelete={
                      showModeratorCommentTools && onModeratorDeleteComment
                        ? () => onModeratorDeleteComment(c)
                        : undefined
                    }
                    onModeratorPublicationMod={
                      showModeratorCommentTools && onModeratorOpenPublicationModComment
                        ? () => onModeratorOpenPublicationModComment(c)
                        : undefined
                    }
                    moderatorAuthorHistoryHref={
                      showModeratorCommentTools && moderatorCommentAuthorHistoryHref
                        ? moderatorCommentAuthorHistoryHref(c)
                        : undefined
                    }
                    onAdminEdit={
                      onAdminEditComment && c.isMine ? () => onAdminEditComment(c) : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
