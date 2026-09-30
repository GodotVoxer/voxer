"use client";
import type { CommentPublic } from "@/lib/vox/types";
import type { CommentTagBackref } from "@/features/comments/backrefs";
import {
  commentRowActionProps,
  type CommentRowActions,
} from "@/features/comments/commentRowActions";
import { CommentRow } from "@/components/Comments/Comment/CommentRow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: CommentPublic | null;
  voxId: string;
  taggedBy: CommentTagBackref[];
  repliesCount: number;
  resolveComment: (publicTagUpper: string) => CommentPublic | undefined;
  onReplyTag: (tag: string) => void;
  onTagClick: (publicTag: string) => void;
  onOpenReplies: (publicTag: string) => void;
  actions?: CommentRowActions;
};

/** The quoted comment renders with the thread's own `CommentRow`, so it looks the same wherever it opens. */
export const CommentTagPopup = ({
  open,
  onOpenChange,
  comment,
  voxId,
  taggedBy,
  repliesCount,
  resolveComment,
  onReplyTag,
  onTagClick,
  onOpenReplies,
  actions,
}: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(85vh,640px)] sm:max-w-md"
        showClose
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {comment ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-fg-soft">
                Comentario citado
              </DialogTitle>
            </DialogHeader>
            <div className="-mx-2 max-h-[min(70vh,520px)] overflow-y-auto border-t border-fg/10 px-2">
              <CommentRow
                comment={comment}
                voxId={voxId}
                copy
                hideTimestamp
                onReplyTag={onReplyTag}
                onTagClick={onTagClick}
                taggedBy={taggedBy}
                resolveComment={resolveComment}
                repliesCount={repliesCount}
                onOpenReplies={onOpenReplies}
                previewSide="left"
                {...(actions ? commentRowActionProps(actions, comment) : {})}
              />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
