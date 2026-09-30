const REPLY_TAG_IN_BODY_RE = />>([A-Za-z0-9]{8})/g;
export type CommentTagBackref = {
  /** publicTag of the comment that wrote the `>>` pointing here. */
  taggerPublicTag: string;
  /** Whether the tagger is the thread's OP (the vox creator). */
  taggerIsOp: boolean;
};
export type CommentForBackrefs = {
  publicTag: string;
  body: string;
  isOp: boolean;
};
export const buildTaggedByIndex = (
  comments: readonly CommentForBackrefs[],
): Map<string, CommentTagBackref[]> => {
  const map = new Map<string, CommentTagBackref[]>();
  for (const c of comments) {
    const fromTag = c.publicTag.toUpperCase();
    for (const m of c.body.matchAll(REPLY_TAG_IN_BODY_RE)) {
      const target = m[1]!.toUpperCase();
      const list = map.get(target) ?? [];
      list.push({ taggerPublicTag: fromTag, taggerIsOp: c.isOp });
      map.set(target, list);
    }
  }
  return map;
};
export type CommentLikeForReplies = {
  id: string;
  publicTag: string;
  body: string;
  createdAt: string;
};
export const buildRepliesToIndex = <T extends CommentLikeForReplies>(
  comments: readonly T[],
): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  const seen = new Map<string, Set<string>>();
  for (const c of comments) {
    const targets = new Set<string>();
    for (const m of c.body.matchAll(REPLY_TAG_IN_BODY_RE)) {
      targets.add(m[1]!.toUpperCase());
    }
    for (const target of targets) {
      let ids = seen.get(target);
      if (!ids) {
        ids = new Set();
        seen.set(target, ids);
      }
      if (ids.has(c.id)) continue;
      ids.add(c.id);
      const list = map.get(target) ?? [];
      list.push(c);
      map.set(target, list);
    }
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
        b.id.localeCompare(a.id),
    );
  }
  return map;
};
