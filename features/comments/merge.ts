import type { CommentPublic } from "@/lib/vox/types";

const sortNewestFirst = (xs: CommentPublic[]): CommentPublic[] =>
  [...xs].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id.localeCompare(a.id),
  );

/** Adds or updates a comment; on the same `id` or `publicTag` the incoming version wins (e.g. a socket/reload race). */
export const mergeCommentIntoList = (
  previous: CommentPublic[],
  incoming: CommentPublic,
): CommentPublic[] => {
  const tagUpper = incoming.publicTag.toUpperCase();
  const idx = previous.findIndex(
    (x) => x.id === incoming.id || x.publicTag.toUpperCase() === tagUpper,
  );
  if (idx >= 0) {
    const next = [...previous];
    const prev = previous[idx];
    next[idx] = {
      ...incoming,
      isMine: Boolean(incoming.isMine || prev.isMine),
      // The vox room payload does not know the reader: it must not overwrite the viewer's own state.
      repliesMuted: incoming.isMine ? incoming.repliesMuted : prev.repliesMuted,
    };
    return sortNewestFirst(next);
  }
  return sortNewestFirst([...previous, incoming]);
};

export const mergeCommentsIntoList = (
  previous: CommentPublic[],
  incoming: CommentPublic[],
): CommentPublic[] => incoming.reduce(mergeCommentIntoList, previous);
