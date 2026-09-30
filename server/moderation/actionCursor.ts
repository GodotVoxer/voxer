import { decodeOpaqueCursor, encodeOpaqueCursor } from "@/server/http/opaqueCursor";

export type ModerationActionCursor = {
  createdAtMs: number;
  id: string;
};

export const encodeModerationActionCursor = (c: ModerationActionCursor): string =>
  encodeOpaqueCursor(c);

export const decodeModerationActionCursor = (raw: string): ModerationActionCursor | null => {
  const v = decodeOpaqueCursor(raw) as Partial<ModerationActionCursor> | null | undefined;
  if (typeof v?.createdAtMs !== "number" || typeof v.id !== "string") return null;
  return { createdAtMs: v.createdAtMs, id: v.id };
};
