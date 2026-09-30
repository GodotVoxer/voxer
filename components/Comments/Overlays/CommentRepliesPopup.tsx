"use client";
import type { CommentPublic } from "@/lib/vox/types";
import type { CommentTagBackref } from "@/features/comments/backrefs";
import {
  commentRowActionProps,
  type CommentRowActions,
} from "@/features/comments/commentRowActions";
import { CommentRow } from "@/components/Comments/Comment/CommentRow";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ReplyTagHandler } from "@/components/Comments/Comment/CommentTagButton";
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchorPublicTag: string;
  replies: CommentPublic[];
  voxId: string;
  taggedByIndex: Map<string, CommentTagBackref[]>;
  repliesByTarget: Map<string, CommentPublic[]>;
  resolveComment: (publicTagUpper: string) => CommentPublic | undefined;
  onReplyTag: ReplyTagHandler;
  onTagClick: (tag: string) => void;
  onOpenReplies: (publicTag: string) => void;
  actions?: CommentRowActions;
};
export const CommentRepliesPopup = ({
  open,
  onOpenChange,
  anchorPublicTag,
  replies,
  voxId,
  taggedByIndex,
  repliesByTarget,
  resolveComment,
  onReplyTag,
  onTagClick,
  onOpenReplies,
  actions,
}: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[min(92vh,720px)] sm:max-w-lg"
        showClose
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-fg-soft">
            Respuestas a <span className="font-mono text-brand-300">{anchorPublicTag}</span>
            <span className="text-sm font-normal text-fg-subtle"> ({replies.length})</span>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[min(70vh,560px)] overflow-y-auto border-t border-fg/10 pt-3 -mx-2 px-2">
          {replies.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              voxId={voxId}
              onReplyTag={onReplyTag}
              onTagClick={onTagClick}
              taggedBy={taggedByIndex.get(c.publicTag.toUpperCase()) ?? []}
              resolveComment={resolveComment}
              repliesCount={repliesByTarget.get(c.publicTag.toUpperCase())?.length ?? 0}
              onOpenReplies={onOpenReplies}
              previewSide="left"
              copy
              hideTimestamp
              {...(actions ? commentRowActionProps(actions, c) : {})}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
