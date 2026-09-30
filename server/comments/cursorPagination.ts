import { decodeOpaqueCursor, encodeOpaqueCursor } from "@/server/http/opaqueCursor";

export type CommentCursor = {
  createdAtMs: number;
  id: string;
};

export const encodeCommentCursor = (c: CommentCursor): string => encodeOpaqueCursor(c);

export const decodeCommentCursor = (raw: string): CommentCursor | null => {
  const v = decodeOpaqueCursor(raw) as Partial<CommentCursor> | null | undefined;
  if (typeof v?.createdAtMs !== "number" || typeof v.id !== "string" || !v.id) return null;
  return { createdAtMs: v.createdAtMs, id: v.id };
};
