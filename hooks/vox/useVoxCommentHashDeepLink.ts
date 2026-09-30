import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { CommentThreadHandle } from "@/features/comments/threadHandle";
import type { CommentPublic } from "@/lib/vox/types";
import { parseCommentPublicTagFromLocationHash } from "@/features/comments/publicTagFromHash";
import { useWindowHashFragment } from "@/hooks/common/useWindowHashFragment";

type Params = {
  voxId: string;
  commentsLoading: boolean;
  commentsError: string | null;
  voxReady: boolean;
  comments: CommentPublic[];
  threadRef: MutableRefObject<CommentThreadHandle | null>;
};

export const useVoxCommentHashDeepLink = ({
  voxId,
  commentsLoading,
  commentsError,
  voxReady,
  comments,
  threadRef,
}: Params) => {
  const urlHashFragment = useWindowHashFragment();
  const [highlightPublicTagUpper, setHighlightPublicTagUpper] = useState<string | null>(null);
  const suppressUntilHashChangeRef = useRef(false);
  const appliedDeepLinkKeyRef = useRef("");

  useEffect(() => {
    suppressUntilHashChangeRef.current = false;
    appliedDeepLinkKeyRef.current = "";
  }, [voxId, urlHashFragment]);

  const targetTagUpper = useMemo(
    () => parseCommentPublicTagFromLocationHash(`#${urlHashFragment}`),
    [urlHashFragment],
  );

  const tagPresent = useMemo(() => {
    if (!targetTagUpper) return false;
    return comments.some((c) => c.publicTag.toUpperCase() === targetTagUpper);
  }, [comments, targetTagUpper]);

  const commentsPanelReady = voxReady && !commentsLoading && !commentsError && comments.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (commentsLoading || !targetTagUpper || !tagPresent) {
      if (!targetTagUpper && !suppressUntilHashChangeRef.current) {
        setHighlightPublicTagUpper(null);
      }
      return;
    }
    if (!commentsPanelReady) return;
    if (suppressUntilHashChangeRef.current) return;

    const key = `${voxId}:${targetTagUpper}`;
    if (appliedDeepLinkKeyRef.current === key) return;
    appliedDeepLinkKeyRef.current = key;

    const runScroll = () => {
      threadRef.current?.scrollToPublicTag(targetTagUpper);
    };
    requestAnimationFrame(() => {
      runScroll();
      requestAnimationFrame(() => {
        runScroll();
        setHighlightPublicTagUpper(targetTagUpper);
      });
    });
  }, [commentsLoading, targetTagUpper, tagPresent, voxId, threadRef, commentsPanelReady]);

  const clearHighlightFromUserAction = useCallback(() => {
    suppressUntilHashChangeRef.current = true;
    setHighlightPublicTagUpper(null);
  }, []);

  return { highlightPublicTagUpper, clearHighlightFromUserAction };
};
