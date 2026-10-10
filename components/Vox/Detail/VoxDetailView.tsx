"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CommentPublic, VoxDetail, VoxPollPublic } from "@/lib/vox/types";
import type { CommentRowActions } from "@/features/comments/commentRowActions";
import { CommentHoverPreviewProvider } from "@/components/Comments/Overlays/CommentHoverPreviewContext";
import { useAuthStore } from "@/features/auth/store";
import { isAdminRole, isStaffRole } from "@/lib/moderation/roles";
import { useCommentThreadPopups } from "@/hooks/comments/useCommentThreadPopups";
import { useMarkVoxNotificationsRead } from "@/hooks/notifications/useMarkVoxNotificationsRead";
import { useMarkVoxModerationNotificationsRead } from "@/hooks/notifications/useMarkVoxModerationNotificationsRead";
import { useClearNativeVoxNotifications } from "@/hooks/notifications/useClearNativeVoxNotifications";
import { newestSeenCommentAt } from "@/features/notifications/markVoxRead";
import { useVoxCommentsRealtime } from "@/hooks/vox/useVoxCommentsRealtime";
import { useVoxCommentHashDeepLink } from "@/hooks/vox/useVoxCommentHashDeepLink";
import { useVoxCommentHighlightDismiss } from "@/hooks/vox/useVoxCommentHighlightDismiss";
import { useVoxDetailInitialLoad } from "@/hooks/vox/useVoxDetailInitialLoad";
import { useVoxDetailModeration } from "@/hooks/vox/useVoxDetailModeration";
import { useVoxFollowHide } from "@/hooks/vox/useVoxFollowHide";
import { mergeCommentIntoList, mergeCommentsIntoList } from "@/features/comments/merge";
import { mergeRealtimePoll } from "@/features/vox/detail/pollMerge";
import { applyCommentPinnedToList, pinnedCommentsNewestFirst } from "@/features/comments/pinning";
import { collectCommentGalleryItems } from "@/features/comments/galleryItems";
import type { CommentThreadHandle } from "@/features/comments/threadHandle";
import type { CommentComposerHandle } from "@/components/Comments/Composer/CommentComposer";
import type { ReplyTagHandler } from "@/components/Comments/Comment/CommentTagButton";
import { VoxDetailSkeleton } from "@/components/Vox/Detail/VoxDetailSkeleton";
import { VoxDetailLoadError } from "./VoxDetailLoadError";
import { VoxDetailSidebar } from "./VoxDetailSidebar";
import { VoxDetailCommentsPanel } from "./VoxDetailCommentsPanel";
import { VoxDetailCommentOverlays } from "./VoxDetailCommentOverlays";
import { VoxDetailDialogs } from "./VoxDetailDialogs";
import { VoxDetailBackdrop } from "@/components/Vox/Detail/VoxDetailBackdrop";
import { useVoxDetailScrollChain } from "@/hooks/vox/useVoxDetailScrollChain";

const COMMENT_INSTANT_LIVE_KEY = "vox-comments-instant-live";

export const VoxDetailView = ({
  id,
  initialVox,
  markModerationNotificationsRead = false,
}: {
  id: string;
  initialVox?: VoxDetail | null;
  markModerationNotificationsRead?: boolean;
}) => {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const {
    vox,
    setVox,
    comments,
    setComments,
    commentsLoading,
    commentsError,
    loadError,
    setLoadError,
    reloadComments,
    reloadVox,
    retryAfterLoadError,
  } = useVoxDetailInitialLoad(id, initialVox);

  const seenThrough = useMemo(() => newestSeenCommentAt(comments), [comments]);
  const notificationsCaughtUp = useMarkVoxNotificationsRead(id, {
    ready: !commentsLoading && !commentsError,
    seenThrough,
  });
  useMarkVoxModerationNotificationsRead(id, markModerationNotificationsRead);
  useClearNativeVoxNotifications(id, notificationsCaughtUp);

  const mod = useVoxDetailModeration({
    voxId: id,
    router,
    setComments,
    reloadComments,
    reloadVox,
  });

  const [tagPopupUpper, setTagPopupUpper] = useState<string | null>(null);
  const [repliesAnchorUpper, setRepliesAnchorUpper] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLElement>(null);
  const layoutRowRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<CommentThreadHandle>(null);
  const composerRef = useRef<CommentComposerHandle>(null);

  const [pendingPollVote, setPendingPollVote] = useState<{
    optionId: string;
    label: string;
    badgeHue: number;
  } | null>(null);

  const handleLocalPollChange = useCallback(
    (nextPoll: VoxPollPublic) => {
      setVox((prev) => (prev ? { ...prev, poll: nextPoll } : prev));
    },
    [setVox],
  );

  const handleRealtimePollUpdated = useCallback(
    (incomingPoll: VoxPollPublic) => {
      setVox((prev) => {
        if (!prev) return prev;
        if (prev.hasPoll && !prev.poll) return prev;
        return {
          ...prev,
          poll: mergeRealtimePoll(prev.poll, incomingPoll),
        };
      });
    },
    [setVox],
  );
  const [instantLive, setInstantLive] = useState(() => {
    try {
      return (
        typeof window !== "undefined" && localStorage.getItem(COMMENT_INSTANT_LIVE_KEY) === "1"
      );
    } catch {
      return false;
    }
  });
  const [pendingSocketComments, setPendingSocketComments] = useState<CommentPublic[]>([]);

  const commentDelivery = instantLive ? "instant" : "batched";

  const onBatchedComment = useCallback((incoming: CommentPublic) => {
    setPendingSocketComments((prev) =>
      prev.some((x) => x.id === incoming.id) ? prev : [...prev, incoming],
    );
  }, []);

  const onCommentPinned = useCallback(
    (commentId: string, pinnedAt: string | null) => {
      setComments((prev) => applyCommentPinnedToList(prev, commentId, pinnedAt));
    },
    [setComments],
  );

  const onCommentRemoved = useCallback((commentId: string) => {
    setPendingSocketComments((prev) => prev.filter((x) => x.id !== commentId));
  }, []);

  const visiblePendingSocketComments = useMemo(
    () => pendingSocketComments.filter((p) => !comments.some((c) => c.id === p.id)),
    [pendingSocketComments, comments],
  );

  const toggleInstantLive = useCallback(() => {
    setInstantLive((prev) => {
      const next = !prev;
      if (next) {
        setPendingSocketComments((pending) => {
          if (pending.length > 0) {
            setComments((curr) => pending.reduce((acc, p) => mergeCommentIntoList(acc, p), curr));
          }
          return [];
        });
      }
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(COMMENT_INSTANT_LIVE_KEY, next ? "1" : "0");
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [setComments]);

  const flushPendingComments = useCallback(() => {
    setPendingSocketComments((pending) => {
      if (pending.length === 0) return pending;
      const batch = pending;
      setComments((curr) => batch.reduce((acc, p) => mergeCommentIntoList(acc, p), curr));
      return [];
    });
  }, [setComments]);

  const galleryComments = useMemo(() => {
    const byId = new Map<string, CommentPublic>();
    for (const c of comments) byId.set(c.id, c);
    for (const p of visiblePendingSocketComments) byId.set(p.id, p);
    return [...byId.values()];
  }, [comments, visiblePendingSocketComments]);

  const galleryItems = useMemo(
    () => collectCommentGalleryItems(galleryComments),
    [galleryComments],
  );

  const totalCommentCount = comments.length + visiblePendingSocketComments.length;

  const pinnedComments = useMemo(() => pinnedCommentsNewestFirst(comments), [comments]);

  const { highlightPublicTagUpper, clearHighlightFromUserAction } = useVoxCommentHashDeepLink({
    voxId: id,
    commentsLoading,
    commentsError,
    voxReady: Boolean(vox),
    comments,
    threadRef,
  });

  useVoxCommentHighlightDismiss({ clearHighlightFromUserAction });

  const {
    taggedByIndex,
    repliesByTarget,
    resolveComment,
    popupComment,
    popupTaggedBy,
    popupRepliesCount,
    repliesList,
    openTagPopup,
    openReplies,
  } = useCommentThreadPopups({
    voxId: id,
    comments,
    commentsLoading,
    tagPopupUpper,
    setTagPopupUpper,
    repliesAnchorUpper,
    setRepliesAnchorUpper,
    threadRef,
  });

  useVoxCommentsRealtime({
    voxId: id,
    voxIsReady: Boolean(vox),
    setComments,
    setVox,
    setLoadError,
    reloadComments,
    reloadVox,
    commentDelivery,
    onBatchedComment,
    onCommentRemoved,
    onCommentPinned,
    onPollUpdated: handleRealtimePollUpdated,
  });

  const { followBusy, hideBusy, favoriteBusy, toggleFollow, toggleHideFromFeed, toggleFavorite } =
    useVoxFollowHide({
      voxId: id,
      vox,
      authUser,
      setVox,
    });

  const onReplyInsertTag = useCallback<ReplyTagHandler>((tag, origin) => {
    composerRef.current?.insertReply(tag, origin);
  }, []);

  useVoxDetailScrollChain({
    rowRef: layoutRowRef,
    sourceRef: sidebarScrollRef,
    targetRef: scrollRef,
    enabled: Boolean(vox),
  });

  if (loadError) {
    return <VoxDetailLoadError message={loadError} onRetry={retryAfterLoadError} />;
  }

  if (!vox) {
    return <VoxDetailSkeleton />;
  }

  const staff = Boolean(authUser && isStaffRole(authUser.role));
  const onAdminEditComment = isAdminRole(authUser?.role) ? mod.setEditCommentTarget : undefined;

  // The same actions the panel gives thread rows: dialogs show the same buttons for the same comment.
  const commentRowActions: CommentRowActions = {
    onReportComment: authUser ? mod.openReportComment : undefined,
    showReportOnComments: Boolean(authUser),
    onCommentRepliesMutedChange: authUser
      ? (commentId, muted) =>
          setComments((p) => p.map((c) => (c.id === commentId ? { ...c, repliesMuted: muted } : c)))
      : undefined,
    onCommentPinnedChange: vox?.isOwner ? onCommentPinned : undefined,
    onModeratorDeleteComment: staff ? mod.requestModeratorDeleteComment : undefined,
    onModeratorOpenPublicationModComment: staff ? mod.openPublicationStaffModForComment : undefined,
    moderatorCommentAuthorHistoryHref: staff
      ? (c) => `/moderacion/historial-publicaciones?commentId=${encodeURIComponent(c.id)}`
      : undefined,
    showModeratorCommentTools: staff,
    onAdminEditComment,
  };

  return (
    <CommentHoverPreviewProvider
      value={{
        voxId: id,
        taggedByIndex,
        repliesByTarget,
        resolveComment,
        onReplyTag: onReplyInsertTag,
        onTagClick: openTagPopup,
        onOpenReplies: openReplies,
        actions: commentRowActions,
      }}
    >
      <main className="isolate mt-[var(--app-header-offset)] min-h-[calc(100dvh-var(--app-header-offset))] bg-surface-vox-detail text-fg lg:flex lg:h-[calc(100dvh-var(--app-header-offset))] lg:min-h-0 lg:flex-col lg:overflow-hidden">
        <VoxDetailBackdrop />
        <VoxDetailDialogs
          voxId={id}
          voxTitle={vox.title}
          reportOpen={mod.reportOpen}
          onReportOpenChange={mod.setReportOpen}
          reportCommentId={mod.reportCommentId}
          categoryDialogOpen={mod.categoryDialogOpen}
          onCategoryDialogOpenChange={mod.setCategoryDialogOpen}
          categoryValue={mod.newCategory || vox.category}
          onCategoryChange={mod.setNewCategory}
          onRecategorizeSave={mod.onModeratorRecategorize}
          editVoxDialogOpen={mod.editVoxDialogOpen}
          onEditVoxDialogOpenChange={mod.setEditVoxDialogOpen}
          editVoxDraft={mod.editVoxDraft}
          onEditVoxDraftChange={mod.setEditVoxDraft}
          voxDescription={vox.description}
          onEditVoxSave={mod.onAdminEditVox}
          publicationStaffModOpen={mod.publicationStaffModOpen}
          onPublicationStaffModOpenChange={(open) => {
            mod.setPublicationStaffModOpen(open);
            if (!open) mod.setPublicationStaffModTarget(null);
          }}
          publicationStaffModTarget={mod.publicationStaffModTarget}
          onPublicationStaffCompleted={mod.onPublicationStaffCompleted}
          deleteCommentTarget={mod.deleteCommentTarget}
          onDeleteCommentDialogOpenChange={(o) => {
            if (!o) mod.dismissDeleteCommentDialog();
          }}
          confirmModeratorDeleteComment={mod.confirmModeratorDeleteComment}
          editCommentTarget={mod.editCommentTarget}
          onEditCommentDialogOpenChange={(open) => {
            if (!open) mod.setEditCommentTarget(null);
          }}
          voxIsOwner={vox.isOwner}
          onEditCommentSave={mod.onAdminEditComment}
        />

        <VoxDetailCommentOverlays
          voxId={id}
          popupComment={popupComment}
          tagPopupOpen={popupComment !== null}
          onTagPopupOpenChange={(open) => {
            if (!open) setTagPopupUpper(null);
          }}
          popupTaggedBy={popupTaggedBy}
          popupRepliesCount={popupRepliesCount}
          resolveComment={resolveComment}
          onTagClick={openTagPopup}
          onOpenReplies={openReplies}
          repliesPopupOpen={repliesAnchorUpper !== null && repliesList.length > 0}
          onRepliesPopupOpenChange={(open) => {
            if (!open) setRepliesAnchorUpper(null);
          }}
          repliesAnchorUpper={repliesAnchorUpper ?? ""}
          repliesList={repliesList}
          taggedByIndex={taggedByIndex}
          repliesByTarget={repliesByTarget}
          onReplyTag={onReplyInsertTag}
          actions={commentRowActions}
        />

        <div className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <div
            ref={layoutRowRef}
            className="flex w-full min-w-0 flex-col lg:min-h-0 lg:flex-1 lg:flex-row lg:items-start"
          >
            <VoxDetailSidebar
              vox={vox}
              scrollRef={sidebarScrollRef}
              authUser={authUser}
              staff={staff}
              followBusy={followBusy}
              hideBusy={hideBusy}
              favoriteBusy={favoriteBusy}
              onToggleFollow={() => void toggleFollow()}
              onToggleHideFromFeed={() => void toggleHideFromFeed()}
              onToggleFavorite={() => void toggleFavorite()}
              onReportVox={mod.openReportVox}
              onOpenModerateVox={mod.openPublicationStaffModForVox}
              onOpenEditVox={() =>
                mod.openEditVoxDialog({ title: vox.title, description: vox.description })
              }
              onOpenRecategorize={() => {
                mod.setNewCategory(vox.category);
                mod.setCategoryDialogOpen(true);
              }}
              onPollChange={handleLocalPollChange}
              onPollVoted={(choice) => {
                setPendingPollVote(choice);
                requestAnimationFrame(() => {
                  document
                    .querySelector("[data-vox-comment-composer-anchor]")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                });
              }}
            />

            <VoxDetailCommentsPanel
              voxId={id}
              comments={comments}
              commentsLoading={commentsLoading}
              commentsError={commentsError}
              onRetryComments={() => void reloadComments()}
              onPostedComment={(posted) => {
                setPendingPollVote(null);
                setPendingSocketComments((pending) => {
                  setComments((current) => mergeCommentsIntoList(current, [...pending, posted]));
                  return [];
                });
              }}
              pendingPollVote={pendingPollVote}
              onDismissPendingPollVote={() => setPendingPollVote(null)}
              scrollParentRef={scrollRef}
              threadRef={threadRef}
              composerRef={composerRef}
              taggedByIndex={taggedByIndex}
              repliesByTarget={repliesByTarget}
              resolveComment={resolveComment}
              onReplyTag={onReplyInsertTag}
              onTagClick={openTagPopup}
              onOpenReplies={openReplies}
              onReportComment={authUser ? mod.openReportComment : undefined}
              showReportOnComments={Boolean(authUser)}
              onCommentRepliesMutedChange={
                authUser
                  ? (commentId, muted) =>
                      setComments((p) =>
                        p.map((c) => (c.id === commentId ? { ...c, repliesMuted: muted } : c)),
                      )
                  : undefined
              }
              pinnedComments={pinnedComments}
              onCommentPinnedChange={vox.isOwner ? onCommentPinned : undefined}
              onModeratorDeleteComment={staff ? mod.requestModeratorDeleteComment : undefined}
              onModeratorOpenPublicationModComment={
                staff ? mod.openPublicationStaffModForComment : undefined
              }
              moderatorCommentAuthorHistoryHref={
                staff
                  ? (c) =>
                      `/moderacion/historial-publicaciones?commentId=${encodeURIComponent(c.id)}`
                  : undefined
              }
              showModeratorCommentTools={staff}
              onAdminEditComment={onAdminEditComment}
              highlightPublicTagUpper={highlightPublicTagUpper}
              totalCommentCount={totalCommentCount}
              pendingNewCount={visiblePendingSocketComments.length}
              instantLive={instantLive}
              onToggleInstantLive={toggleInstantLive}
              onRevealPending={flushPendingComments}
              galleryItems={galleryItems}
            />
          </div>
        </div>
      </main>
    </CommentHoverPreviewProvider>
  );
};
