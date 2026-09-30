"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CommentPublic } from "@/lib/vox/types";
import type { CommentTagBackref } from "@/features/comments/backrefs";
import type { CommentRowActions } from "@/features/comments/commentRowActions";
import type { ReplyTagHandler } from "@/components/Comments/Comment/CommentTagButton";

export type CommentHoverPreviewContextValue = {
  voxId: string;
  taggedByIndex: Map<string, CommentTagBackref[]>;
  repliesByTarget: Map<string, CommentPublic[]>;
  resolveComment: (publicTagUpper: string) => CommentPublic | undefined;
  onReplyTag: ReplyTagHandler;
  onTagClick: (tag: string) => void;
  onOpenReplies: (publicTag: string) => void;
  actions?: CommentRowActions;
};

const CommentHoverPreviewContext = createContext<CommentHoverPreviewContextValue | null>(null);

export const CommentHoverPreviewProvider = ({
  value,
  children,
}: {
  value: CommentHoverPreviewContextValue;
  children: ReactNode;
}) => (
  <CommentHoverPreviewContext.Provider value={value}>
    {children}
  </CommentHoverPreviewContext.Provider>
);

export const useCommentHoverPreviewContext = () => useContext(CommentHoverPreviewContext);
