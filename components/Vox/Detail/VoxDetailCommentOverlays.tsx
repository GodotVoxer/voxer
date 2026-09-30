"use client";
import { CommentRepliesPopup } from "@/components/Comments/Overlays/CommentRepliesPopup";
import { CommentTagPopup } from "@/components/Comments/Overlays/CommentTagPopup";
import type { CommentPublic } from "@/lib/vox/types";
import type { CommentTagBackref } from "@/features/comments/backrefs";
import type { CommentRowActions } from "@/features/comments/commentRowActions";
import type { ReplyTagHandler } from "@/components/Comments/Comment/CommentTagButton";

type Props = {
  voxId: string;
  popupComment: CommentPublic | null;
  tagPopupOpen: boolean;
  onTagPopupOpenChange: (open: boolean) => void;
  popupTaggedBy: CommentTagBackref[];
  popupRepliesCount: number;
  resolveComment: (tag: string) => CommentPublic | undefined;
  onTagClick: (tag: string) => void;
  onOpenReplies: (publicTag: string) => void;
  repliesPopupOpen: boolean;
  onRepliesPopupOpenChange: (open: boolean) => void;
  repliesAnchorUpper: string;
  repliesList: CommentPublic[];
  taggedByIndex: Map<string, CommentTagBackref[]>;
  repliesByTarget: Map<string, CommentPublic[]>;
  onReplyTag: ReplyTagHandler;
  /** The same buttons as the thread row, so dialogs are not stripped of them. */
  actions?: CommentRowActions;
};

export const VoxDetailCommentOverlays = ({
  voxId,
  popupComment,
  tagPopupOpen,
  onTagPopupOpenChange,
  popupTaggedBy,
  popupRepliesCount,
  resolveComment,
  onTagClick,
  onOpenReplies,
  repliesPopupOpen,
  onRepliesPopupOpenChange,
  repliesAnchorUpper,
  repliesList,
  taggedByIndex,
  repliesByTarget,
  onReplyTag,
  actions,
}: Props) => {
  return (
    <>
      <CommentTagPopup
        open={tagPopupOpen}
        onOpenChange={onTagPopupOpenChange}
        comment={popupComment}
        voxId={voxId}
        taggedBy={popupTaggedBy}
        repliesCount={popupRepliesCount}
        resolveComment={resolveComment}
        onReplyTag={onReplyTag}
        onTagClick={onTagClick}
        onOpenReplies={onOpenReplies}
        actions={actions}
      />
      <CommentRepliesPopup
        open={repliesPopupOpen}
        onOpenChange={onRepliesPopupOpenChange}
        anchorPublicTag={repliesAnchorUpper}
        replies={repliesList}
        voxId={voxId}
        taggedByIndex={taggedByIndex}
        repliesByTarget={repliesByTarget}
        resolveComment={resolveComment}
        onReplyTag={onReplyTag}
        onTagClick={onTagClick}
        onOpenReplies={onOpenReplies}
        actions={actions}
      />
    </>
  );
};
