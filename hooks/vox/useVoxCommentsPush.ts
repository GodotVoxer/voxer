import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { CommentPublic, VoxDetail, VoxPollPublic } from "@/lib/vox/types";
import { mergeCommentIntoList } from "@/features/comments/merge";
import { acquireRealtimeRoom } from "@/features/realtime/acquire";
import { realtimePushEnabled } from "@/lib/realtime/mode";
import { voxUpdatedEffect } from "@/features/vox/detail/updatedEvent";

export type VoxCommentsRealtimeArgs = {
  voxId: string;
  voxIsReady: boolean;
  setComments: Dispatch<SetStateAction<CommentPublic[]>>;
  setVox: Dispatch<SetStateAction<VoxDetail | null>>;
  setLoadError: Dispatch<SetStateAction<string | null>>;
  reloadComments: () => Promise<void>;
  reloadVox: () => Promise<void>;
  commentDelivery: "instant" | "batched";
  onBatchedComment: (comment: CommentPublic) => void;
  onCommentRemoved: (commentId: string) => void;
  /** Pinned or unpinned by the vox owner: moves the pinned copy without reloading the thread. */
  onCommentPinned: (commentId: string, pinnedAt: string | null) => void;
  onPollUpdated?: (poll: VoxPollPublic) => void;
};

export const useVoxCommentsPush = ({
  voxId,
  voxIsReady,
  setComments,
  setVox,
  setLoadError,
  reloadComments,
  reloadVox,
  commentDelivery,
  onBatchedComment,
  onCommentRemoved,
  onCommentPinned,
  onPollUpdated,
}: VoxCommentsRealtimeArgs) => {
  useEffect(() => {
    if (!realtimePushEnabled()) return;
    if (!voxIsReady) return;

    let cancelled = false;
    let teardown: (() => void) | undefined;

    void acquireRealtimeRoom({ room: `vox:${voxId}` }).then(
      (lease) => {
        if (!lease) return;
        if (cancelled) {
          lease.release();
          return;
        }

        const reloadAfterBulkModeration = () => {
          void reloadComments();
          void reloadVox();
        };
        const reloadAfterReconnect = () => {
          void Promise.all([reloadComments(), reloadVox()]);
        };
        const onCommentCreated = (comment: CommentPublic) => {
          if (commentDelivery === "batched") {
            onBatchedComment(comment);
            return;
          }
          setComments((prev) => mergeCommentIntoList(prev, comment));
        };
        // Only replaces rows already present: an edit must not slip in a comment the reader has not
        // asked to see (batch mode) or resurrect one that is gone.
        const onCommentUpdated = (comment: CommentPublic) => {
          if (!comment?.id) return;
          setComments((prev) =>
            prev.some((x) => x.id === comment.id) ? mergeCommentIntoList(prev, comment) : prev,
          );
        };
        const onCommentDeleted = (payload: { commentId?: string }) => {
          const commentId = payload?.commentId;
          if (commentId) {
            setComments((prev) => prev.filter((x) => x.id !== commentId));
            onCommentRemoved(commentId);
          }
        };
        const onCommentPinnedEvent = (payload: {
          commentId?: string;
          pinnedAt?: string | null;
        }) => {
          const commentId = payload?.commentId;
          if (commentId) onCommentPinned(commentId, payload.pinnedAt ?? null);
        };
        const onVoxDeleted = (payload?: {
          voxId?: string;
          reason?: "moderation" | "retention";
        }) => {
          const msg =
            payload?.reason === "retention"
              ? "Este vox dejó de estar disponible (límite de historial)."
              : "Este vox fue eliminado por moderación.";
          setLoadError(msg);
          setVox(null);
        };
        const onCommentRestored = () => {
          void reloadComments();
        };
        const onPollUpdatedEvent = (payload: VoxPollPublic) => {
          if (onPollUpdated) onPollUpdated(payload);
        };
        const onVoxRestored = () => {
          void reloadVox();
        };
        // `vox:updated` comes from the owner's edit, recategorization and pin, each with different
        // fields; `voxUpdatedEffect` decides what to do.
        const onVoxUpdated = (payload: unknown) => {
          const effect = voxUpdatedEffect(payload);
          if (effect.kind === "reload") {
            void reloadVox();
            return;
          }
          if (effect.kind === "patch-category") {
            const { category } = effect;
            setVox((prev) => (prev ? { ...prev, category } : prev));
          }
        };

        const listeners: Array<[string, (data: unknown) => void]> = [
          ["comment:created", onCommentCreated as (data: unknown) => void],
          ["comment:deleted", onCommentDeleted as (data: unknown) => void],
          ["comment:updated", onCommentUpdated as (data: unknown) => void],
          ["comment:pinned", onCommentPinnedEvent as (data: unknown) => void],
          ["vox:deleted", onVoxDeleted as (data: unknown) => void],
          ["vox:moderation-bulk", reloadAfterBulkModeration as (data: unknown) => void],
          ["comment:restored", onCommentRestored as (data: unknown) => void],
          ["poll:updated", onPollUpdatedEvent as (data: unknown) => void],
          ["vox:restored", onVoxRestored as (data: unknown) => void],
          ["vox:updated", onVoxUpdated],
        ];

        lease.onReconnect(reloadAfterReconnect);
        for (const [event, handler] of listeners) lease.on(event, handler);

        teardown = () => {
          lease.offReconnect(reloadAfterReconnect);
          for (const [event, handler] of listeners) lease.off(event, handler);
          lease.release();
        };
      },
      () => undefined,
    );

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [
    voxId,
    voxIsReady,
    setComments,
    setVox,
    setLoadError,
    reloadComments,
    reloadVox,
    commentDelivery,
    onBatchedComment,
    onCommentRemoved,
    onCommentPinned,
    onPollUpdated,
  ]);
};
