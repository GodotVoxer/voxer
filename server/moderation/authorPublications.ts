import { hidesAdminIdentity } from "@/lib/moderation/roles";
import { Prisma, type UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { encodeAuthorPublicationsCursor } from "@/server/moderation/authorPublicationsCursor";
import type {
  AuthorPublicationsAnchor,
  ModerationAuthorPublicationComment,
  ModerationAuthorPublicationItem,
  ModerationAuthorPublicationVox,
} from "@/lib/moderation/authorPublicationsTypes";
import { clampPageLimit } from "@/server/http/pagination";

export type ResolveModerationHistoryAnchorResult =
  | { ok: false; reason: "not_found" }
  | {
      ok: true;
      authorId: string | null;
      authorRole?: UserRole | null;
      anchor: AuthorPublicationsAnchor;
    };

export const resolveModerationHistoryAnchorAuthorId = async (input: {
  voxId?: string;
  commentId?: string;
}): Promise<ResolveModerationHistoryAnchorResult> => {
  if (input.voxId) {
    const row = await prisma.vox.findFirst({
      where: { id: input.voxId, deletedAt: null },
      select: { ownerId: true, owner: { select: { role: true } } },
    });
    if (!row) return { ok: false, reason: "not_found" };
    return {
      ok: true,
      authorId: row.ownerId,
      authorRole: row.owner?.role ?? null,
      anchor: { kind: "vox", voxId: input.voxId },
    };
  }
  if (input.commentId) {
    const row = await prisma.comment.findFirst({
      where: { id: input.commentId, deletedAt: null },
      select: { authorId: true, author: { select: { role: true } } },
    });
    if (!row) return { ok: false, reason: "not_found" };
    return {
      ok: true,
      authorId: row.authorId,
      authorRole: row.author?.role ?? null,
      anchor: { kind: "comment", commentId: input.commentId },
    };
  }
  return { ok: false, reason: "not_found" };
};

type MergedSqlRow = {
  kind: string;
  id: string;
  createdAt: Date;
  category: string;
  primaryLabel: string;
  secondaryLabel: string;
  thumbnailUrl: string | null;
  mediaType: string;
  refVoxId: string;
  imageUrl: string | null;
  videoUrl: string | null;
  publicTag: string | null;
  videoPosterUrl: string | null;
};

const mapRowToItem = (row: MergedSqlRow): ModerationAuthorPublicationItem | null => {
  if (row.kind === "vox") {
    const item: ModerationAuthorPublicationVox = {
      kind: "vox",
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      category: row.category,
      title: row.primaryLabel,
      description: row.secondaryLabel,
      thumbnailUrl: row.thumbnailUrl,
      mediaType: row.mediaType,
    };
    return item;
  }
  if (row.kind === "comment") {
    const publicTag = row.publicTag?.trim();
    if (!publicTag) return null;
    const item: ModerationAuthorPublicationComment = {
      kind: "comment",
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      category: row.category,
      voxId: row.refVoxId,
      voxTitle: row.secondaryLabel,
      bodyPreview: row.primaryLabel,
      publicTag,
      imageUrl: row.imageUrl,
      videoUrl: row.videoUrl,
      videoPosterUrl: row.videoPosterUrl,
    };
    return item;
  }
  return null;
};

const unionPart = (authorId: string) => Prisma.sql`
  (
    SELECT
      'vox'::text AS kind,
      v.id,
      v."createdAt",
      v.category,
      v.title AS "primaryLabel",
      LEFT(v.description, 800) AS "secondaryLabel",
      v."thumbnailUrl",
      v."mediaType"::text AS "mediaType",
      v.id AS "refVoxId",
      NULL::text AS "imageUrl",
      NULL::text AS "videoUrl",
      NULL::text AS "publicTag",
      NULL::text AS "videoPosterUrl"
    FROM "Vox" v
    WHERE v."ownerId" = ${authorId} AND v."deletedAt" IS NULL
  )
  UNION ALL
  (
    SELECT
      'comment'::text AS kind,
      c.id,
      c."createdAt",
      vx.category,
      LEFT(BTRIM(c.body), 500) AS "primaryLabel",
      vx.title AS "secondaryLabel",
      NULL::text AS "thumbnailUrl",
      ''::text AS "mediaType",
      vx.id AS "refVoxId",
      c."imageUrl",
      c."videoUrl",
      c."publicTag",
      c."videoPosterUrl"
    FROM "Comment" c
    INNER JOIN "Vox" vx ON vx.id = c."voxId" AND vx."deletedAt" IS NULL
    WHERE c."authorId" = ${authorId} AND c."deletedAt" IS NULL
  )
`;

export const listModerationAuthorPublications = async (options: {
  viewerUserId: string;
  authorId: string;
  cursor: { createdAt: Date; id: string } | null;
  limit: number;
}): Promise<{ items: ModerationAuthorPublicationItem[]; nextCursor: string | null }> => {
  const author = await prisma.user.findUnique({
    where: { id: options.authorId },
    select: { role: true },
  });
  if (!author || hidesAdminIdentity(author.role, options.authorId, options.viewerUserId)) {
    return { items: [], nextCursor: null };
  }
  const limit = clampPageLimit(options.limit, { max: 50, fallback: 50 });
  const take = limit + 1;
  const authorId = options.authorId;
  const cursor = options.cursor;
  const whereCursor =
    cursor == null
      ? Prisma.sql`TRUE`
      : Prisma.sql`(m."createdAt" < ${cursor.createdAt} OR (m."createdAt" = ${cursor.createdAt} AND m.id < ${cursor.id}))`;

  const rows = await prisma.$queryRaw<MergedSqlRow[]>`
    SELECT * FROM (${unionPart(authorId)}) AS m
    WHERE ${whereCursor}
    ORDER BY m."createdAt" DESC, m.id DESC
    LIMIT ${take}
  `;

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeAuthorPublicationsCursor({
          t: last.createdAt.toISOString(),
          id: last.id,
        })
      : null;

  const items: ModerationAuthorPublicationItem[] = [];
  for (const r of page) {
    const mapped = mapRowToItem(r);
    if (mapped) items.push(mapped);
  }
  return { items, nextCursor };
};
