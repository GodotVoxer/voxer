import { prisma } from "@/server/db/prisma";
import { decodeMyCommentsCursor, encodeMyCommentsCursor } from "@/server/comments/myCommentsCursor";
import type { MyCommentItem, MyCommentsPage } from "@/lib/comments/myCommentsTypes";
import { clampPageLimit } from "@/server/http/pagination";

export const MY_COMMENTS_PAGE_LIMIT_MAX = 30;
export const MY_COMMENTS_PAGE_LIMIT_DEFAULT = 20;

export const clampMyCommentsLimit = (raw: string | null): number => {
  if (raw == null || raw.trim() === "") return MY_COMMENTS_PAGE_LIMIT_DEFAULT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return MY_COMMENTS_PAGE_LIMIT_DEFAULT;
  return clampPageLimit(parsed, {
    max: MY_COMMENTS_PAGE_LIMIT_MAX,
    fallback: MY_COMMENTS_PAGE_LIMIT_DEFAULT,
  });
};

export type ListMyCommentsResult =
  | { ok: true; page: MyCommentsPage }
  | { ok: false; reason: "bad_cursor" };

/**
 * The user's own comment history. Served only to its author, so it includes each comment's
 * `publicTag` and vox to jump straight to it. Comments removed by moderation are not listed.
 */
export const listMyComments = async (input: {
  userId: string;
  cursor: string | null;
  limit: number;
  query?: string | null;
}): Promise<ListMyCommentsResult> => {
  const query = input.query?.trim() ?? "";
  let keyset: { createdAt: Date; id: string } | null = null;
  if (input.cursor) {
    const decoded = decodeMyCommentsCursor(input.cursor);
    if (!decoded) return { ok: false, reason: "bad_cursor" };
    keyset = { createdAt: new Date(decoded.createdAtMs), id: decoded.id };
  }

  const rows = await prisma.comment.findMany({
    where: {
      authorId: input.userId,
      deletedAt: null,
      ...(query ? { body: { contains: query, mode: "insensitive" as const } } : {}),
      // A deleted vox takes its comments with it: those rows would lead nowhere.
      vox: { deletedAt: null },
      ...(keyset
        ? {
            OR: [
              { createdAt: { lt: keyset.createdAt } },
              { createdAt: keyset.createdAt, id: { lt: keyset.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: input.limit + 1,
    select: {
      id: true,
      publicTag: true,
      body: true,
      createdAt: true,
      imageUrl: true,
      videoUrl: true,
      videoPosterUrl: true,
      animatedImage: true,
      pinnedAt: true,
      vox: { select: { id: true, title: true, category: true } },
    },
  });

  const hasMore = rows.length > input.limit;
  const pageRows = hasMore ? rows.slice(0, input.limit) : rows;
  const items: MyCommentItem[] = pageRows.map((row) => ({
    id: row.id,
    publicTag: row.publicTag,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    imageUrl: row.imageUrl,
    videoUrl: row.videoUrl,
    videoPosterUrl: row.videoPosterUrl,
    animatedImage: row.animatedImage,
    pinned: row.pinnedAt !== null,
    voxId: row.vox.id,
    voxTitle: row.vox.title,
    voxCategory: row.vox.category,
  }));

  const last = pageRows.at(-1);
  return {
    ok: true,
    page: {
      items,
      hasMore,
      nextCursor:
        hasMore && last
          ? encodeMyCommentsCursor({ createdAtMs: last.createdAt.getTime(), id: last.id })
          : null,
    },
  };
};
