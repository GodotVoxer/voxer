import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  decodeModerationActionCursor,
  encodeModerationActionCursor,
  type ModerationActionCursor,
} from "@/server/moderation/actionCursor";
import { clampPageLimit } from "@/server/http/pagination";

/** Case-insensitive partial match on the acting moderator's username. */
export const moderationActorUsernameWhere = (
  raw: string,
): Prisma.ModerationActionWhereInput | null => {
  const t = raw.trim();
  if (!t) return null;
  return {
    actor: {
      username: { contains: t, mode: "insensitive" },
    },
  };
};

export type ModerationActionListRow = {
  id: string;
  actionType: string;
  payload: unknown;
  relatedBanId: string | null;
  createdAt: string;
  undoneAt: string | null;
  actorUsername: string;
  actorRole: UserRole;
};

export const listModerationActions = async (options: {
  viewerUserId: string;
  take: number;
  cursor?: string;
  actorUserId?: string;
  actorUsername?: string;
  relatedBanId?: string;
}): Promise<{ items: ModerationActionListRow[]; nextCursor: string | null }> => {
  const take = clampPageLimit(options.take, { max: 100, fallback: 100 });
  const cursorParsed: ModerationActionCursor | null = options.cursor
    ? decodeModerationActionCursor(options.cursor)
    : null;
  if (options.cursor && !cursorParsed) {
    return { items: [], nextCursor: null };
  }
  const parts: Prisma.ModerationActionWhereInput[] = [];
  if (options.actorUserId) parts.push({ actorUserId: options.actorUserId });
  const actorUsernameWhere = options.actorUsername
    ? moderationActorUsernameWhere(options.actorUsername)
    : null;
  if (actorUsernameWhere) parts.push(actorUsernameWhere);
  if (options.relatedBanId) parts.push({ relatedBanId: options.relatedBanId });
  if (cursorParsed) {
    parts.push({
      OR: [
        { createdAt: { lt: new Date(cursorParsed.createdAtMs) } },
        {
          AND: [{ createdAt: new Date(cursorParsed.createdAtMs) }, { id: { lt: cursorParsed.id } }],
        },
      ],
    });
  }
  const where: Prisma.ModerationActionWhereInput = parts.length ? { AND: parts } : {};
  const rows = await prisma.moderationAction.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    include: { actor: { select: { username: true, role: true } } },
  });
  let nextCursor: string | null = null;
  let items = rows;
  if (rows.length > take) {
    const last = rows[take - 1];
    if (last) {
      nextCursor = encodeModerationActionCursor({
        createdAtMs: last.createdAt.getTime(),
        id: last.id,
      });
    }
    items = rows.slice(0, take);
  }
  return {
    items: items.map((r) => ({
      id: r.id,
      actionType: r.actionType,
      payload: moderationActionListPayload(r.payload),
      relatedBanId: r.relatedBanId,
      createdAt: r.createdAt.toISOString(),
      undoneAt: r.undoneAt?.toISOString() ?? null,
      actorUsername: r.actor.username,
      actorRole: r.actor.role,
    })),
    nextCursor,
  };
};

export const moderationActionListPayload = (payload: unknown): unknown => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const copy = { ...payload } as Record<string, unknown>;
  delete copy.snapshots;
  return copy;
};
