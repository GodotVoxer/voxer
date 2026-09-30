"use client";
import { CommentRow } from "@/components/Comments/Comment/CommentRow";
import type { ModerationCommentSnapshot } from "@/lib/moderation/commentSnapshotTypes";

const noop = () => {};
const unresolved = () => undefined;

export const ModerationCommentPreview = ({ comment }: { comment: ModerationCommentSnapshot }) => (
  <div className="min-w-0 max-w-full [overflow-wrap:anywhere]">
    {comment.deletedAt ? <p className="text-xs text-danger-400">Comentario eliminado</p> : null}
    <CommentRow
      comment={comment}
      voxId={comment.voxId}
      readOnly
      copy
      onReplyTag={noop}
      onTagClick={noop}
      taggedBy={[]}
      resolveComment={unresolved}
      repliesCount={0}
      onOpenReplies={noop}
    />
  </div>
);
