"use client";
import type { CommentPublic } from "@/lib/vox/types";
import { CommentRow } from "@/components/Comments/Comment/CommentRow";
import { commentRowActionProps } from "@/features/comments/commentRowActions";
import { useCommentHoverPreviewContext } from "./CommentHoverPreviewContext";
type Props = {
  comment: CommentPublic;
};
export const CommentHoverPreview = ({ comment }: Props) => {
  const context = useCommentHoverPreviewContext();

  if (!context) return null;

  const tagUpper = comment.publicTag.toUpperCase();

  return (
    <div className="max-h-[min(70vh,36rem)] overflow-y-auto px-1">
      <CommentRow
        comment={comment}
        voxId={context.voxId}
        copy
        hideTimestamp
        onReplyTag={context.onReplyTag}
        onTagClick={context.onTagClick}
        taggedBy={context.taggedByIndex.get(tagUpper) ?? []}
        resolveComment={context.resolveComment}
        repliesCount={context.repliesByTarget.get(tagUpper)?.length ?? 0}
        onOpenReplies={context.onOpenReplies}
        previewSide="left"
        {...(context.actions ? commentRowActionProps(context.actions, comment) : {})}
      />
    </div>
  );
};
