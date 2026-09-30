import { decodeOpaqueCursor, encodeOpaqueCursor } from "@/server/http/opaqueCursor";

export type VoxListCursor = {
  id: string;
  pinnedAtMs: number | null;
  lastActivityAtMs: number;
};

const CURSOR_PREFIX = "k1.";

export const encodeVoxListCursor = (cursor: VoxListCursor): string =>
  encodeOpaqueCursor([cursor.pinnedAtMs, cursor.lastActivityAtMs, cursor.id], CURSOR_PREFIX);

export const decodeVoxListCursor = (raw: string): VoxListCursor | null => {
  const parsed = decodeOpaqueCursor(raw, CURSOR_PREFIX);
  if (!Array.isArray(parsed) || parsed.length !== 3) return null;
  const [pinnedAtMs, lastActivityAtMs, id] = parsed as unknown[];
  if (pinnedAtMs !== null && !Number.isSafeInteger(pinnedAtMs)) return null;
  if (!Number.isSafeInteger(lastActivityAtMs)) return null;
  if (typeof id !== "string" || id.length === 0) return null;
  return {
    id,
    pinnedAtMs: pinnedAtMs as number | null,
    lastActivityAtMs: lastActivityAtMs as number,
  };
};
