import { useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import type { CommentPublic } from "@/lib/vox/types";
import { buildRepliesToIndex, buildTaggedByIndex } from "@/features/comments/backrefs";
import type { CommentThreadHandle } from "@/features/comments/threadHandle";
import { useSettingsStore } from "@/features/settings/store";

type Args = {
  voxId: string;
  comments: CommentPublic[];
  commentsLoading: boolean;
  tagPopupUpper: string | null;
  setTagPopupUpper: (tag: string | null) => void;
  repliesAnchorUpper: string | null;
  setRepliesAnchorUpper: (tag: string | null) => void;
  threadRef: RefObject<CommentThreadHandle | null>;
};

export const useCommentThreadPopups = ({
  voxId,
  comments,
  commentsLoading,
  tagPopupUpper,
  setTagPopupUpper,
  repliesAnchorUpper,
  setRepliesAnchorUpper,
  threadRef,
}: Args) => {
  const hashScrollDoneRef = useRef(false);

  const taggedByIndex = useMemo(() => buildTaggedByIndex(comments), [comments]);
  const repliesByTarget = useMemo(() => buildRepliesToIndex(comments), [comments]);

  const resolveComment = useCallback(
    (tag: string) => {
      const upper = tag.toUpperCase();
      return comments.find((c) => c.publicTag.toUpperCase() === upper);
    },
    [comments],
  );

  const popupComment = useMemo(() => {
    if (!tagPopupUpper) return null;
    return comments.find((c) => c.publicTag.toUpperCase() === tagPopupUpper) ?? null;
  }, [tagPopupUpper, comments]);

  const popupTaggedBy = useMemo(() => {
    if (!popupComment) return [];
    return taggedByIndex.get(popupComment.publicTag.toUpperCase()) ?? [];
  }, [popupComment, taggedByIndex]);

  const popupRepliesCount = useMemo(() => {
    if (!popupComment) return 0;
    return repliesByTarget.get(popupComment.publicTag.toUpperCase())?.length ?? 0;
  }, [popupComment, repliesByTarget]);

  const repliesList = useMemo(() => {
    if (!repliesAnchorUpper) return [];
    return repliesByTarget.get(repliesAnchorUpper) ?? [];
  }, [repliesAnchorUpper, repliesByTarget]);

  useEffect(() => {
    if (tagPopupUpper && !popupComment) setTagPopupUpper(null);
  }, [tagPopupUpper, popupComment, setTagPopupUpper]);

  const classicTagNavigation = useSettingsStore((s) => s.classicTagNavigation);

  const scrollToTag = useCallback(
    (upper: string) => {
      setTagPopupUpper(null);
      setRepliesAnchorUpper(null);
      threadRef.current?.scrollToPublicTag(upper);
    },
    [setTagPopupUpper, setRepliesAnchorUpper, threadRef],
  );

  const openTagPopup = useCallback(
    (tag: string) => {
      const upper = tag.toUpperCase();
      if (!comments.some((c) => c.publicTag.toUpperCase() === upper)) return;
      if (classicTagNavigation) {
        scrollToTag(upper);
        return;
      }
      setTagPopupUpper(upper);
      setRepliesAnchorUpper(null);
    },
    [comments, classicTagNavigation, scrollToTag, setTagPopupUpper, setRepliesAnchorUpper],
  );

  const openReplies = useCallback(
    (publicTag: string) => {
      const upper = publicTag.toUpperCase();
      const list = repliesByTarget.get(upper);
      if (!list?.length) return;
      // With classic tags and a single reply there is one clear target; with several, the dialog stays.
      if (classicTagNavigation && list.length === 1) {
        scrollToTag(list[0].publicTag.toUpperCase());
        return;
      }
      setRepliesAnchorUpper(upper);
      setTagPopupUpper(null);
    },
    [repliesByTarget, classicTagNavigation, scrollToTag, setRepliesAnchorUpper, setTagPopupUpper],
  );

  useEffect(() => {
    hashScrollDoneRef.current = false;
  }, [voxId]);

  useEffect(() => {
    if (commentsLoading || comments.length === 0) return;
    if (hashScrollDoneRef.current) return;
    const raw = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "").trim() : "";
    if (!raw) return;
    const tag = raw.toUpperCase();
    if (!comments.some((c) => c.publicTag.toUpperCase() === tag)) return;
    hashScrollDoneRef.current = true;
    requestAnimationFrame(() => {
      threadRef.current?.scrollToPublicTag(tag);
    });
  }, [comments, commentsLoading, voxId, threadRef]);

  return {
    taggedByIndex,
    repliesByTarget,
    resolveComment,
    popupComment,
    popupTaggedBy,
    popupRepliesCount,
    repliesList,
    openTagPopup,
    openReplies,
  };
};
