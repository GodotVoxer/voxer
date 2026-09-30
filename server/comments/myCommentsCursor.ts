import { decodeOpaqueCursor, encodeOpaqueCursor } from "@/server/http/opaqueCursor";

export type MyCommentsCursor = {
  createdAtMs: number;
  id: string;
};

const CURSOR_PREFIX = "mc1.";

/** Keyset on `(createdAt, id)`: unlike `skip`, it stays stable while the user posts or deletes. */
export const encodeMyCommentsCursor = (cursor: MyCommentsCursor): string =>
  encodeOpaqueCursor([cursor.createdAtMs, cursor.id], CURSOR_PREFIX);

export const decodeMyCommentsCursor = (raw: string): MyCommentsCursor | null => {
  const parsed = decodeOpaqueCursor(raw, CURSOR_PREFIX);
  if (!Array.isArray(parsed) || parsed.length !== 2) return null;
  const [createdAtMs, id] = parsed as unknown[];
  if (!Number.isSafeInteger(createdAtMs)) return null;
  if (typeof id !== "string" || id.length === 0) return null;
  return { createdAtMs: createdAtMs as number, id };
};
