"use client";

import { createContext, useContext } from "react";

type CommentMediaActivityApi = {
  /** The virtualized thread keeps a row mounted while its player is open. */
  setCommentMediaOpen: (commentId: string, open: boolean) => void;
};

const CommentMediaActivityContext = createContext<CommentMediaActivityApi | null>(null);

export const CommentMediaActivityProvider = CommentMediaActivityContext.Provider;

/** `null` outside the thread (e.g. the vox media, which is not virtualized). */
export const useCommentMediaActivity = (): CommentMediaActivityApi | null =>
  useContext(CommentMediaActivityContext);
