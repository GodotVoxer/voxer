import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  decodeCommentCursor,
  encodeCommentCursor,
  type CommentCursor,
} from "@/server/comments/cursorPagination";
import { toPublicComment, type CommentPublicApi } from "./serialize";
export type ListCommentsResult =
  | {
      ok: true;
      comments: CommentPublicApi[];
      nextCursor: string | null;
    }
  | {
      ok: false;
      kind: "not_found" | "bad_cursor" | "db_error";
    };

export type CommentsAfter = {
  createdAt: Date;
  id: string;
};

export const listCommentsForVox = async (
  voxId: string,
  cursorRaw: string | undefined,
  limit: number,
  viewerUserId: string | null,
  /** Only comments newer than this, ascending and without `nextCursor`: incremental sync. */
  after: CommentsAfter | null = null,
): Promise<ListCommentsResult> => {
  const cursorParsed: CommentCursor | null = cursorRaw ? decodeCommentCursor(cursorRaw) : null;
  if (cursorRaw && !cursorParsed) {
    return { ok: false, kind: "bad_cursor" };
  }
  try {
    const vox = await prisma.vox.findUnique({
      where: { id: voxId },
      select: {
        id: true,
        ownerId: true,
        deletedAt: true,
        threadUniqueIdsEnabled: true,
      },
    });
    if (!vox || vox.deletedAt) return { ok: false, kind: "not_found" };
    /** Newest first; the cursor is the oldest comment of the previous page. */
    let where: Prisma.CommentWhereInput;
    if (after) {
      where = {
        voxId,
        deletedAt: null,
        OR: [
          { createdAt: { gt: after.createdAt } },
          { AND: [{ createdAt: after.createdAt }, { id: { gt: after.id } }] },
        ],
      };
    } else if (cursorParsed === null) {
      where = { voxId, deletedAt: null };
    } else {
      where = {
        voxId,
        deletedAt: null,
        OR: [
          { createdAt: { lt: new Date(cursorParsed.createdAtMs) } },
          {
            AND: [
              { createdAt: new Date(cursorParsed.createdAtMs) },
              { id: { lt: cursorParsed.id } },
            ],
          },
        ],
      };
    }
    const direction = after ? "asc" : "desc";
    const rows = await prisma.comment.findMany({
      where,
      orderBy: [{ createdAt: direction }, { id: direction }],
      take: limit + 1,
      include: {
        pollDisclosureOption: { select: { label: true, sortOrder: true } },
      },
    });
    let nextCursor: string | null = null;
    let items = rows;
    if (rows.length > limit) {
      if (!after) {
        const lastKeep = rows[limit - 1];
        nextCursor = encodeCommentCursor({
          createdAtMs: lastKeep.createdAt.getTime(),
          id: lastKeep.id,
        });
      }
      items = rows.slice(0, limit);
    }
    const ownerId = vox.ownerId;
    const payload = items.map((c) => {
      const isOp = ownerId !== null && c.authorId !== null && c.authorId === ownerId;
      return toPublicComment(c, isOp, {
        threadIdsEnabled: vox.threadUniqueIdsEnabled,
        viewerUserId,
      });
    });
    return { ok: true, comments: payload, nextCursor };
  } catch {
    return { ok: false, kind: "db_error" };
  }
};
