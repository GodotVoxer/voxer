import type { CommentPublic } from "@/lib/vox/types";

const pinnedAtMs = (c: CommentPublic): number => {
  const raw = c.pinnedAt;
  if (!raw) return 0;
  const ms = new Date(raw).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

/** Copies shown above the thread, latest pin first. */
export const pinnedCommentsNewestFirst = (comments: CommentPublic[]): CommentPublic[] =>
  comments
    .filter((c) => Boolean(c.pinnedAt))
    .sort((a, b) => pinnedAtMs(b) - pinnedAtMs(a) || b.id.localeCompare(a.id));

/** Applies a `comment:pinned` event (or the response to one's own click) without reordering the thread. */
export const applyCommentPinnedToList = (
  comments: CommentPublic[],
  commentId: string,
  pinnedAt: string | null,
): CommentPublic[] => {
  let changed = false;
  const next = comments.map((c) => {
    if (c.id !== commentId || (c.pinnedAt ?? null) === pinnedAt) return c;
    changed = true;
    return { ...c, pinnedAt };
  });
  return changed ? next : comments;
};
