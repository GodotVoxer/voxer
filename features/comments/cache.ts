import type { CommentPublic } from "@/lib/vox/types";

const COMMENT_CACHE_TTL_MS = 180_000;
const COMMENT_CACHE_MAX_VOX = 10;

type Entry = { comments: CommentPublic[]; cachedAt: number };

const entries = new Map<string, Entry>();

export const readCachedComments = (voxId: string, now = Date.now()): CommentPublic[] | null => {
  const entry = entries.get(voxId);
  if (!entry) return null;
  if (now - entry.cachedAt > COMMENT_CACHE_TTL_MS) {
    entries.delete(voxId);
    return null;
  }
  entries.delete(voxId);
  entries.set(voxId, entry);
  return entry.comments;
};

export const cacheComments = (voxId: string, comments: CommentPublic[], now = Date.now()): void => {
  entries.delete(voxId);
  entries.set(voxId, { comments, cachedAt: now });
  while (entries.size > COMMENT_CACHE_MAX_VOX) {
    const oldestKey = entries.keys().next().value as string | undefined;
    if (!oldestKey) break;
    entries.delete(oldestKey);
  }
};

export const clearCommentCache = (): void => entries.clear();
