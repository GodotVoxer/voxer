import { decodeOpaqueCursor, encodeOpaqueCursor } from "@/server/http/opaqueCursor";

export type AuthorPublicationsCursorPayload = {
  /** ISO 8601 */
  t: string;
  id: string;
};

export const encodeAuthorPublicationsCursor = (payload: AuthorPublicationsCursorPayload): string =>
  encodeOpaqueCursor(payload);

export const parseAuthorPublicationsCursor = (
  cursor: string | null | undefined,
): AuthorPublicationsCursorPayload | null => {
  if (cursor == null || cursor.trim() === "") return null;
  const v = decodeOpaqueCursor(cursor.trim()) as
    | Partial<AuthorPublicationsCursorPayload>
    | null
    | undefined;
  if (typeof v?.t !== "string" || typeof v.id !== "string" || !v.t || !v.id) return null;
  return { t: v.t, id: v.id };
};
