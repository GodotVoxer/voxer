"use client";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  type RefObject,
} from "react";
import type { CommentPublic } from "@/lib/vox/types";
import type { CommentTagBackref } from "@/features/comments/backrefs";
import { estimateCommentRowHeight } from "@/features/comments/threadEstimate";
import { rangeWithPinnedIndexes } from "@/features/comments/threadRange";
import { CommentMediaActivityProvider } from "@/components/Comments/Thread/CommentMediaActivity";
import { CommentRow } from "@/components/Comments/Comment/CommentRow";
import { useThreadVirtualizer } from "@/hooks/comments/useThreadVirtualizer";
import type { CommentThreadHandle } from "@/features/comments/threadHandle";
import type { ReplyTagHandler } from "@/components/Comments/Comment/CommentTagButton";
type Props = {
  comments: CommentPublic[];
  voxId: string;
  taggedByIndex: Map<string, CommentTagBackref[]>;
  repliesByTarget: Map<string, CommentPublic[]>;
  resolveComment: (publicTagUpper: string) => CommentPublic | undefined;
  onReplyTag: ReplyTagHandler;
  onTagClick: (tag: string) => void;
  onOpenReplies: (publicTag: string) => void;
  scrollParentRef: RefObject<HTMLDivElement | null>;
  /** The page scrolls (mobile) instead of `scrollParentRef`. */
  documentScroll: boolean;
  /** Offset (px) between the start of the scroll and the start of the thread; `null` until measured. */
  scrollMargin: number | null;
  onReportComment?: (comment: CommentPublic) => void;
  showReportOnComments?: boolean;
  onCommentRepliesMutedChange?: (commentId: string, muted: boolean) => void;
  /** Passed only when the reader owns the vox: enables pinning. */
  onCommentPinnedChange?: (commentId: string, pinnedAt: string | null) => void;
  onModeratorDeleteComment?: (comment: CommentPublic) => void;
  onModeratorOpenPublicationModComment?: (comment: CommentPublic) => void;
  moderatorCommentAuthorHistoryHref?: (comment: CommentPublic) => string | undefined;
  showModeratorCommentTools?: boolean;
  onAdminEditComment?: (comment: CommentPublic) => void;
  highlightPublicTagUpper?: string | null;
};
export const CommentThread = forwardRef<CommentThreadHandle, Props>(function CommentThread(
  {
    comments,
    voxId,
    taggedByIndex,
    repliesByTarget,
    resolveComment,
    onReplyTag,
    onTagClick,
    onOpenReplies,
    scrollParentRef,
    documentScroll,
    scrollMargin,
    onReportComment,
    showReportOnComments,
    onCommentRepliesMutedChange,
    onCommentPinnedChange,
    onModeratorDeleteComment,
    onModeratorOpenPublicationModComment,
    moderatorCommentAuthorHistoryHref,
    showModeratorCommentTools,
    onAdminEditComment,
    highlightPublicTagUpper,
  },
  ref,
) {
  /** Comments with an open player: their row stays mounted even when scrolled far away. */
  const [openMediaIds, setOpenMediaIds] = useState<ReadonlySet<string>>(() => new Set());
  const setCommentMediaOpen = useCallback((commentId: string, open: boolean) => {
    setOpenMediaIds((previous) => {
      if (open === previous.has(commentId)) return previous;
      const next = new Set(previous);
      if (open) next.add(commentId);
      else next.delete(commentId);
      return next;
    });
  }, []);
  const mediaActivity = useMemo(() => ({ setCommentMediaOpen }), [setCommentMediaOpen]);

  const pinnedIndexes = useMemo(() => {
    if (openMediaIds.size === 0) return [];
    const indexes: number[] = [];
    comments.forEach((c, index) => {
      if (openMediaIds.has(c.id)) indexes.push(index);
    });
    return indexes;
  }, [comments, openMediaIds]);

  const rangeExtractor = useCallback(
    (range: { startIndex: number; endIndex: number; overscan: number; count: number }) =>
      rangeWithPinnedIndexes(range, pinnedIndexes),
    [pinnedIndexes],
  );

  const virtualizer = useThreadVirtualizer({
    count: comments.length,
    documentScroll,
    scrollParentRef,
    scrollMargin,
    estimateSize: (index) => {
      const c = comments[index];
      const tagUpper = c?.publicTag.toUpperCase() ?? "";
      return estimateCommentRowHeight(
        c,
        taggedByIndex.has(tagUpper) || repliesByTarget.has(tagUpper),
      );
    },
    rangeExtractor,
    getItemKey: (index) => {
      const c = comments[index];
      if (!c) return index;
      return `${c.id}:${c.body.length}:${c.imageUrl ?? ""}:${c.videoUrl ?? ""}:${c.videoPosterUrl ?? ""}`;
    },
  });

  // Row starts include `scrollMargin` (what sits above the thread in the scroll: vox, composer,
  // toolbar); it must not become empty space inside the rendered thread. The total size excludes it.
  const renderOffset = Math.max(0, scrollMargin ?? 0);
  const totalSize = virtualizer.getTotalSize();

  useImperativeHandle(
    ref,
    () => ({
      scrollToPublicTag: (tagUpper: string) => {
        const u = tagUpper.toUpperCase();
        const index = comments.findIndex((c) => c.publicTag.toUpperCase() === u);
        if (index < 0) return;
        virtualizer.scrollToIndex(index, { align: "center" });
        const runIntoView = () => {
          const el = document.getElementById(u);
          if (!el) return;
          el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
        };
        requestAnimationFrame(() => {
          runIntoView();
          requestAnimationFrame(runIntoView);
        });
      },
      scrollScrollAreaToTop: () => {
        virtualizer.scrollToOffset(0, { behavior: "auto" });
      },
      scrollToOldestComment: () => {
        const lastIndex = comments.length - 1;
        if (lastIndex < 0) return;
        // Do not use `scrollIntoView` here: before rows are measured it fights the virtualizer's scroll
        // and leaves stale caches, which show up as large gaps between items.
        virtualizer.scrollToIndex(lastIndex, { align: "end", behavior: "smooth" });
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(lastIndex, { align: "end", behavior: "auto" });
          requestAnimationFrame(() => {
            virtualizer.scrollToIndex(lastIndex, { align: "end", behavior: "auto" });
          });
        });
      },
    }),
    [comments, virtualizer],
  );
  return (
    <CommentMediaActivityProvider value={mediaActivity}>
      <div className="relative w-full" style={{ height: `${totalSize}px` }}>
        {virtualizer.getVirtualItems().map((v) => {
          const c = comments[v.index];
          if (!c) return null;
          return (
            <div
              key={v.key}
              data-index={v.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${Math.max(0, v.start - renderOffset)}px)` }}
            >
              <CommentRow
                comment={c}
                voxId={voxId}
                highlighted={
                  Boolean(highlightPublicTagUpper) &&
                  c.publicTag.toUpperCase() === highlightPublicTagUpper
                }
                onReplyTag={onReplyTag}
                onTagClick={onTagClick}
                taggedBy={taggedByIndex.get(c.publicTag.toUpperCase()) ?? []}
                resolveComment={resolveComment}
                repliesCount={repliesByTarget.get(c.publicTag.toUpperCase())?.length ?? 0}
                onOpenReplies={onOpenReplies}
                onReport={
                  showReportOnComments && onReportComment ? () => onReportComment(c) : undefined
                }
                onRepliesMutedChange={onCommentRepliesMutedChange}
                onPinnedChange={onCommentPinnedChange}
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
    </CommentMediaActivityProvider>
  );
});
