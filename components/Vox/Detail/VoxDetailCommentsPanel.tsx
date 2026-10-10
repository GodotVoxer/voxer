"use client";
import type { RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDocumentScrollElement } from "@/features/device/documentScroll";
import { CommentThread } from "@/components/Comments/Thread/CommentThread";
import type { CommentThreadHandle } from "@/features/comments/threadHandle";
import { CommentThreadSkeleton } from "@/components/Comments/Thread/CommentThreadSkeleton";
import { PinnedCommentsSection } from "@/components/Comments/Thread/PinnedCommentsSection";
import {
  CommentComposer,
  type CommentComposerHandle,
} from "@/components/Comments/Composer/CommentComposer";
import { FriendlyError } from "@/components/Shell/FriendlyError";
import { Button } from "@/components/ui/button";
import type { CommentPublic } from "@/lib/vox/types";
import type { CommentTagBackref } from "@/features/comments/backrefs";
import { VoxDetailCommentsToolbar } from "@/components/Vox/Detail/VoxDetailCommentsToolbar";
import { VoxDetailCommentMediaGalleryDialog } from "@/components/Vox/Detail/VoxDetailCommentMediaGalleryDialog";
import type { CommentGalleryItem } from "@/features/comments/galleryItems";
import { useFloatingCommentComposer } from "@/hooks/comments/useFloatingCommentComposer";
import { useTwoColumnLayout } from "@/hooks/device/useTwoColumnLayout";
import type { ReplyTagHandler } from "@/components/Comments/Comment/CommentTagButton";

type Props = {
  voxId: string;
  comments: CommentPublic[];
  commentsLoading: boolean;
  commentsError: string | null;
  onRetryComments: () => void;
  onPostedComment: (posted: CommentPublic) => void;
  scrollParentRef: RefObject<HTMLDivElement | null>;
  threadRef: RefObject<CommentThreadHandle | null>;
  composerRef: RefObject<CommentComposerHandle | null>;
  taggedByIndex: Map<string, CommentTagBackref[]>;
  repliesByTarget: Map<string, CommentPublic[]>;
  resolveComment: (tag: string) => CommentPublic | undefined;
  onReplyTag: ReplyTagHandler;
  onTagClick: (tag: string) => void;
  onOpenReplies: (publicTag: string) => void;
  onReportComment?: (comment: CommentPublic) => void;
  showReportOnComments: boolean;
  onCommentRepliesMutedChange?: (commentId: string, muted: boolean) => void;
  /** Copies pinned by the vox owner, latest pin first. */
  pinnedComments: CommentPublic[];
  /** Passed only when the reader owns the vox: enables pinning. */
  onCommentPinnedChange?: (commentId: string, pinnedAt: string | null) => void;
  onModeratorDeleteComment?: (comment: CommentPublic) => void;
  onModeratorOpenPublicationModComment?: (comment: CommentPublic) => void;
  moderatorCommentAuthorHistoryHref?: (comment: CommentPublic) => string | undefined;
  showModeratorCommentTools: boolean;
  onAdminEditComment?: (comment: CommentPublic) => void;
  highlightPublicTagUpper?: string | null;
  totalCommentCount: number;
  pendingNewCount: number;
  instantLive: boolean;
  onToggleInstantLive: () => void;
  onRevealPending: () => void;
  galleryItems: CommentGalleryItem[];
  pendingPollVote?: { optionId: string; label: string; badgeHue: number } | null;
  onDismissPendingPollVote?: () => void;
};

export const VoxDetailCommentsPanel = ({
  voxId,
  comments,
  commentsLoading,
  commentsError,
  onRetryComments,
  onPostedComment,
  scrollParentRef,
  threadRef,
  composerRef,
  taggedByIndex,
  repliesByTarget,
  resolveComment,
  onReplyTag,
  onTagClick,
  onOpenReplies,
  onReportComment,
  onCommentRepliesMutedChange,
  pinnedComments,
  onCommentPinnedChange,
  showReportOnComments,
  onModeratorDeleteComment,
  onModeratorOpenPublicationModComment,
  moderatorCommentAuthorHistoryHref,
  showModeratorCommentTools,
  onAdminEditComment,
  highlightPublicTagUpper,
  totalCommentCount,
  pendingNewCount,
  instantLive,
  onToggleInstantLive,
  onRevealPending,
  galleryItems,
  pendingPollVote = null,
  onDismissPendingPollVote,
}: Props) => {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [showScrollToComposerFab, setShowScrollToComposerFab] = useState(false);
  const [fabNearBottom, setFabNearBottom] = useState(false);
  const commentsUseInnerScroll = useTwoColumnLayout();
  const composerAnchorRef = useRef<HTMLDivElement>(null);
  const threadStartRef = useRef<HTMLDivElement>(null);
  const pinnedSectionRef = useRef<HTMLDivElement>(null);
  const [threadScrollMargin, setThreadScrollMargin] = useState<number | null>(null);
  const [pinnedScrollMargin, setPinnedScrollMargin] = useState<number | null>(null);
  const pinnedLaidOut = pinnedScrollMargin !== null;
  const floatingComposer = useFloatingCommentComposer({
    enabled: commentsUseInnerScroll,
    slotRef: composerAnchorRef,
    scrollRootRef: scrollParentRef,
  });

  // A layout effect: the lists mount no rows until they know where they start, and that has to be
  // settled before the first paint.
  useLayoutEffect(() => {
    const offsetInScroll = (el: HTMLElement) =>
      Math.round(
        commentsUseInnerScroll ? el.offsetTop : el.getBoundingClientRect().top + window.scrollY,
      );

    const compute = () => {
      const pinnedEl = pinnedSectionRef.current;
      const threadEl = threadStartRef.current;
      if (!pinnedEl || !threadEl) {
        setPinnedScrollMargin(null);
        setThreadScrollMargin(null);
        return;
      }
      setPinnedScrollMargin(offsetInScroll(pinnedEl));
      // The pinned block sits above the thread: the thread start is only known once its rows are laid
      // out, one render after the block got its own start.
      if (pinnedLaidOut) setThreadScrollMargin(offsetInScroll(threadEl));
    };

    compute();
    window.addEventListener("resize", compute);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(compute) : null;
    ro?.observe(document.documentElement);
    const scrollRoot = scrollParentRef.current;
    const composerEl = composerAnchorRef.current;
    const threadEl = threadStartRef.current;
    const pinnedEl = pinnedSectionRef.current;
    if (threadEl) ro?.observe(threadEl);
    // Collapsing or expanding the pinned block moves the thread start without changing its height.
    if (pinnedEl) ro?.observe(pinnedEl);
    if (composerEl) ro?.observe(composerEl);
    if (commentsUseInnerScroll && scrollRoot) ro?.observe(scrollRoot);

    return () => {
      window.removeEventListener("resize", compute);
      ro?.disconnect();
    };
  }, [
    commentsUseInnerScroll,
    commentsLoading,
    commentsError,
    comments.length,
    pinnedComments.length,
    pinnedLaidOut,
    scrollParentRef,
  ]);

  const updateScrollToComposerFab = useCallback(() => {
    const anchor = composerAnchorRef.current;
    if (!anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    let composerScrolledAway: boolean;
    if (commentsUseInnerScroll) {
      const root = scrollParentRef.current;
      if (!root) return;
      const rootRect = root.getBoundingClientRect();
      composerScrolledAway = anchorRect.bottom < rootRect.top + 12;
    } else {
      const headerEl = document.querySelector("header");
      const headerBottom = headerEl?.getBoundingClientRect().bottom ?? 0;
      composerScrolledAway = anchorRect.bottom < headerBottom + 8;
    }
    setShowScrollToComposerFab(composerScrolledAway);
  }, [commentsUseInnerScroll, scrollParentRef]);

  const updateFabNearBottom = useCallback(() => {
    const thresholdPx = 140;
    if (commentsUseInnerScroll) {
      const root = scrollParentRef.current;
      if (!root) return;
      const remaining = root.scrollHeight - root.scrollTop - root.clientHeight;
      setFabNearBottom(remaining < thresholdPx);
      return;
    }
    const docEl = getDocumentScrollElement();
    if (!docEl) return;
    const remaining = docEl.scrollHeight - (window.scrollY + window.innerHeight);
    setFabNearBottom(remaining < thresholdPx);
  }, [commentsUseInnerScroll, scrollParentRef]);

  useEffect(() => {
    updateScrollToComposerFab();
    updateFabNearBottom();

    const onScroll = () => {
      updateScrollToComposerFab();
      updateFabNearBottom();
    };
    const root = scrollParentRef.current;

    if (commentsUseInnerScroll) {
      if (!root) return;
      root.addEventListener("scroll", onScroll, { passive: true });
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onScroll) : null;
      ro?.observe(root);
      window.addEventListener("resize", onScroll);
      return () => {
        root.removeEventListener("scroll", onScroll);
        ro?.disconnect();
        window.removeEventListener("resize", onScroll);
      };
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [
    scrollParentRef,
    updateScrollToComposerFab,
    updateFabNearBottom,
    commentsLoading,
    commentsError,
    comments.length,
    commentsUseInnerScroll,
  ]);

  const scrollToOldestComment = () => threadRef.current?.scrollToOldestComment();

  const scrollToComposerTop = () => {
    if (commentsUseInnerScroll) {
      const root = scrollParentRef.current;
      threadRef.current?.scrollScrollAreaToTop();
      if (!root) return;
      const snap = () => {
        root.scrollTop = 0;
      };
      snap();
      requestAnimationFrame(() => {
        snap();
        requestAnimationFrame(() => {
          snap();
          updateScrollToComposerFab();
        });
      });
      return;
    }

    // Instant, as on desktop: on the way up rows mount above the viewport, and each scroll correction
    // the virtualizer makes for them cancels a smooth scroll before it arrives.
    composerAnchorRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    requestAnimationFrame(() => updateScrollToComposerFab());
  };

  const titleCount = commentsLoading ? null : totalCommentCount;

  return (
    <section
      className={cn(
        "relative flex w-full flex-col border-t border-fg/10 lg:min-w-0 lg:flex-1 lg:self-stretch lg:border-t-0 lg:border-l",
        commentsUseInnerScroll &&
          "min-h-0 overflow-hidden lg:max-h-[calc(100dvh-var(--app-header-offset))] lg:min-h-[calc(100dvh-var(--app-header-offset))]",
      )}
    >
      <div
        ref={scrollParentRef}
        className={cn(
          "pb-3 lg:px-2",
          commentsUseInnerScroll &&
            "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain",
        )}
      >
        <div
          ref={composerAnchorRef}
          data-vox-comment-composer-anchor
          className={cn(!commentsUseInnerScroll && "scroll-mt-[var(--app-header-offset)]")}
          style={{ minHeight: floatingComposer.slotMinHeight }}
        >
          <CommentComposer
            ref={composerRef}
            voxId={voxId}
            onPosted={(posted) => {
              floatingComposer.close();
              onPostedComment(posted);
            }}
            pendingPollVote={pendingPollVote}
            onDismissPendingPollVote={onDismissPendingPollVote}
            floating={floatingComposer}
          />
        </div>

        <VoxDetailCommentsToolbar
          titleCount={titleCount}
          commentsLoading={commentsLoading}
          pendingNewCount={pendingNewCount}
          instantLive={instantLive}
          onToggleInstantLive={onToggleInstantLive}
          onRevealPending={onRevealPending}
          onOpenMediaGallery={() => setGalleryOpen(true)}
          onScrollToOldestComment={scrollToOldestComment}
        />

        <div className="px-2 pb-2 pt-1 lg:px-0">
          {commentsLoading ? (
            <CommentThreadSkeleton />
          ) : commentsError ? (
            <div className="space-y-3 px-1 py-2">
              <FriendlyError size="compact" title="Comentarios" message={commentsError} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer border-fg/25 bg-surface-raised text-fg hover:bg-fg/10"
                onClick={onRetryComments}
              >
                Reintentar comentarios
              </Button>
            </div>
          ) : comments.length === 0 ? (
            <p className="px-1 py-6 text-sm text-fg-subtle">Todavía no hay comentarios.</p>
          ) : (
            <>
              <div ref={pinnedSectionRef}>
                <PinnedCommentsSection
                  voxId={voxId}
                  pinned={pinnedComments}
                  scrollParentRef={scrollParentRef}
                  documentScroll={!commentsUseInnerScroll}
                  scrollMargin={pinnedScrollMargin}
                  taggedByIndex={taggedByIndex}
                  repliesByTarget={repliesByTarget}
                  resolveComment={resolveComment}
                  onReplyTag={onReplyTag}
                  onTagClick={onTagClick}
                  onOpenReplies={onOpenReplies}
                  onReportComment={onReportComment}
                  showReportOnComments={showReportOnComments}
                  onPinnedChange={onCommentPinnedChange}
                  onRepliesMutedChange={onCommentRepliesMutedChange}
                  onModeratorDeleteComment={onModeratorDeleteComment}
                  onModeratorOpenPublicationModComment={onModeratorOpenPublicationModComment}
                  moderatorCommentAuthorHistoryHref={moderatorCommentAuthorHistoryHref}
                  showModeratorCommentTools={showModeratorCommentTools}
                  onAdminEditComment={onAdminEditComment}
                />
              </div>
              <div ref={threadStartRef}>
                <CommentThread
                  ref={threadRef}
                  comments={comments}
                  voxId={voxId}
                  taggedByIndex={taggedByIndex}
                  repliesByTarget={repliesByTarget}
                  resolveComment={resolveComment}
                  onReplyTag={onReplyTag}
                  onTagClick={onTagClick}
                  onOpenReplies={onOpenReplies}
                  scrollParentRef={scrollParentRef}
                  documentScroll={!commentsUseInnerScroll}
                  scrollMargin={threadScrollMargin}
                  onReportComment={onReportComment}
                  showReportOnComments={showReportOnComments}
                  onCommentRepliesMutedChange={onCommentRepliesMutedChange}
                  onModeratorDeleteComment={onModeratorDeleteComment}
                  onModeratorOpenPublicationModComment={onModeratorOpenPublicationModComment}
                  moderatorCommentAuthorHistoryHref={moderatorCommentAuthorHistoryHref}
                  showModeratorCommentTools={showModeratorCommentTools}
                  onAdminEditComment={onAdminEditComment}
                  onCommentPinnedChange={onCommentPinnedChange}
                  highlightPublicTagUpper={highlightPublicTagUpper}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {showScrollToComposerFab && floatingComposer.phase === "docked" ? (
        <Button
          type="button"
          size="icon"
          className={cn(
            "fixed right-5 z-40 size-12 cursor-pointer rounded-full border border-fg/12 bg-surface-raised/60 text-fg shadow-lg backdrop-blur-sm opacity-80 transition-[bottom,opacity,background-color] hover:bg-surface-raised/80 hover:opacity-100 focus-visible:opacity-100",
            fabNearBottom ? "bottom-20" : "bottom-5",
          )}
          aria-label="Volver al cuadro de comentario"
          title="Volver al cuadro de comentario"
          onClick={scrollToComposerTop}
        >
          <ChevronUp className="size-6" strokeWidth={2} aria-hidden />
        </Button>
      ) : null}

      <VoxDetailCommentMediaGalleryDialog
        open={galleryOpen}
        onOpenChange={setGalleryOpen}
        items={galleryItems}
      />
    </section>
  );
};
