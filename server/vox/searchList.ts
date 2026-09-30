import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { escapeSqlLikePattern } from "@/server/db/sqlLikeEscape";
import {
  rankVoxRowsByFuzzyTitle,
  significantSearchTokens,
  VOX_SEARCH_SQL_POOL_LIMIT,
} from "@/lib/vox/titleSearch";
import { VOX_TITLE_MAX } from "@/lib/limits";
import type { VoxListApiItem, VoxListPage } from "./list";
import { coverGifUrlFromVoxMedia } from "@/lib/vox/coverGifUrl";
import { clampPageLimit } from "@/server/http/pagination";
import { VOX_LIST_PAGE_MAX, VOX_LIST_PAGE_SIZE } from "@/lib/limits";

/** Minimum SQL `similarity()` used only to widen the candidate pool (typos); Fuse filters the final results. */
const SQL_TRIGRAM_POOL_MIN = 0.14;

const SEARCH_LIST_MAX_OFFSET = 2500;

export type SearchCursorParseResult =
  | { ok: true; offset: number }
  | { ok: false; reason: "invalid" };

export const parseSearchCursor = (cursor: string | null): SearchCursorParseResult => {
  if (cursor == null || cursor.trim() === "") {
    return { ok: true, offset: 0 };
  }
  const m = /^s:(\d+)$/.exec(cursor.trim());
  if (!m) {
    return { ok: false, reason: "invalid" };
  }
  const offset = Number.parseInt(m[1], 10);
  if (!Number.isFinite(offset) || offset < 0) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, offset };
};

export const encodeSearchCursor = (offset: number): string => `s:${offset}`;

type SearchRow = {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  mediaType: string;
  animatedImage: boolean;
  createdAt: Date;
  replies: number;
  favorited: boolean;
  hasPoll: boolean;
};

export const searchVoxListItems = async (options: {
  sessionUserId?: string | null;
  q: string;
  cursor?: string | null;
  limit?: number;
}): Promise<VoxListPage> => {
  const raw = options.q.trim();
  if (!raw) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const parsed = parseSearchCursor(options.cursor ?? null);
  if (!parsed.ok) {
    throw new Error("INVALID_SEARCH_CURSOR");
  }
  const offset = parsed.offset;
  if (offset > SEARCH_LIST_MAX_OFFSET) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const limit = clampPageLimit(options.limit, {
    max: VOX_LIST_PAGE_MAX,
    fallback: VOX_LIST_PAGE_SIZE,
  });
  const take = limit + 1;
  const uid = options.sessionUserId ?? null;

  const hideClause =
    uid == null
      ? Prisma.sql``
      : Prisma.sql`AND NOT EXISTS (
          SELECT 1 FROM "VoxHide" h
          WHERE h."voxId" = v.id AND h."userId" = ${uid}
        )`;

  const favoritedExpr =
    uid == null
      ? Prisma.sql`false`
      : Prisma.sql`EXISTS (
          SELECT 1 FROM "VoxFavorite" f
          WHERE f."voxId" = v.id AND f."userId" = ${uid}
        )`;

  const qText = raw.slice(0, VOX_TITLE_MAX);
  const sig = significantSearchTokens(qText);
  const tokenAndClause =
    sig.length === 0
      ? Prisma.sql`FALSE`
      : Prisma.join(
          sig.map((t) => {
            const pat = `%${escapeSqlLikePattern(t)}%`;
            return Prisma.sql`lower(v.title) LIKE ${pat} ESCAPE '\\'`;
          }),
          " AND ",
        );

  const poolRows = await prisma.$queryRaw<SearchRow[]>`
    SELECT
      v.id,
      v.title,
      v.category,
      v."thumbnailUrl",
      v."mediaUrl",
      v."mediaType",
      v."createdAt",
      (SELECT COUNT(*)::int FROM "Comment" c WHERE c."voxId" = v.id AND c."deletedAt" IS NULL) AS replies,
      ${favoritedExpr} AS favorited,
      v."hasPoll" AS "hasPoll"
    FROM "Vox" v
    WHERE v."deletedAt" IS NULL
    ${hideClause}
    AND (
      (${tokenAndClause})
      OR similarity(lower(v.title), lower(${qText}::text)) >= ${SQL_TRIGRAM_POOL_MIN}
    )
    ORDER BY similarity(lower(v.title), lower(${qText}::text)) DESC NULLS LAST,
             v."lastActivityAt" DESC,
             v.id DESC
    LIMIT ${VOX_SEARCH_SQL_POOL_LIMIT}::int
  `;

  const ranked = rankVoxRowsByFuzzyTitle(poolRows, qText);
  const window = ranked.slice(offset, offset + take);
  const hasMore = offset + limit < ranked.length;
  const itemsPage = hasMore ? window.slice(0, limit) : window;
  const nextOffset = offset + itemsPage.length;
  const nextCursor =
    hasMore && nextOffset <= SEARCH_LIST_MAX_OFFSET ? encodeSearchCursor(nextOffset) : null;

  const items: VoxListApiItem[] = itemsPage.map((v) => ({
    id: v.id,
    title: v.title,
    category: v.category,
    thumbnailUrl: v.thumbnailUrl,
    animatedImage: v.animatedImage,
    coverGifUrl: coverGifUrlFromVoxMedia(v.mediaType, v.mediaUrl, v.animatedImage),
    mediaType: v.mediaType,
    replies: v.replies,
    createdAt: v.createdAt.toISOString(),
    favorited: Boolean(v.favorited),
    hasPoll: Boolean(v.hasPoll),
    pinnedAt: null,
  }));

  return {
    items,
    nextCursor,
    hasMore,
  };
};
