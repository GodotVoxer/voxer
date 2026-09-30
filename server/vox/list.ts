import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { coverGifUrlFromVoxMedia } from "@/lib/vox/coverGifUrl";
import {
  decodeVoxListCursor,
  encodeVoxListCursor,
  type VoxListCursor,
} from "@/server/vox/listCursor";
import { clampPageLimit } from "@/server/http/pagination";
import { VOX_LIST_PAGE_MAX, VOX_LIST_PAGE_SIZE } from "@/lib/limits";
export type VoxListView = "default" | "hidden" | "favorites" | "mine";
export type VoxListApiItem = {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  coverGifUrl: string | null;
  /** The animated cover is an MP4 (converted GIF), not a GIF. */
  animatedImage: boolean;
  mediaType: string;
  replies: number;
  createdAt: string;
  favorited: boolean;
  hasPoll: boolean;
  /** Only the main list puts pinned vox first. */
  pinnedAt: string | null;
};

export type VoxListPage = {
  items: VoxListApiItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

type VoxListRow = {
  id: string;
  title: string;
  category: string;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  mediaType: string;
  animatedImage: boolean;
  createdAt: Date;
  lastActivityAt: Date;
  hasPoll: boolean;
  pinnedAt: Date | null;
  favoritedBy?: { userId: string }[];
};

const mapVoxRowToListItem = (
  v: VoxListRow,
  sessionUserId?: string | null,
  replies = 0,
): VoxListApiItem => {
  const uid = sessionUserId ?? null;
  const favorited = uid && v.favoritedBy ? v.favoritedBy.length > 0 : false;
  return {
    id: v.id,
    title: v.title,
    category: v.category,
    thumbnailUrl: v.thumbnailUrl,
    animatedImage: v.animatedImage,
    coverGifUrl: coverGifUrlFromVoxMedia(v.mediaType, v.mediaUrl, v.animatedImage),
    mediaType: v.mediaType,
    replies,
    createdAt: v.createdAt.toISOString(),
    favorited,
    hasPoll: v.hasPoll,
    pinnedAt: v.pinnedAt ? v.pinnedAt.toISOString() : null,
  };
};

const voxListSelect = (sessionUserId?: string | null) => {
  const uid = sessionUserId ?? null;
  return {
    id: true,
    title: true,
    category: true,
    thumbnailUrl: true,
    mediaUrl: true,
    mediaType: true,
    animatedImage: true,
    createdAt: true,
    lastActivityAt: true,
    hasPoll: true,
    pinnedAt: true,
    ...(uid
      ? {
          favoritedBy: {
            where: { userId: uid },
            select: { userId: true },
            take: 1,
          },
        }
      : {}),
  } as const;
};

export const countActiveCommentsForVox = async (voxId: string): Promise<number> => {
  return prisma.comment.count({
    where: { voxId, deletedAt: null },
  });
};

export const getVoxListItemById = async (
  voxId: string,
  sessionUserId?: string | null,
): Promise<VoxListApiItem | null> => {
  const row = await prisma.vox.findFirst({
    where: { id: voxId, deletedAt: null },
    select: voxListSelect(sessionUserId),
  });
  if (!row) return null;
  const replies = await countActiveCommentsForVox(voxId);
  return mapVoxRowToListItem(row as VoxListRow, sessionUserId, replies);
};

export class InvalidVoxListCursorError extends Error {
  constructor() {
    super("INVALID_LIST_CURSOR");
    this.name = "InvalidVoxListCursorError";
  }
}

/** Accepts the keyset cursor or a bare id (legacy cursor from tabs opened before the change). */
const resolveListCursor = async (raw: string): Promise<VoxListCursor> => {
  const decoded = decodeVoxListCursor(raw);
  if (decoded) return decoded;
  const legacy = await prisma.vox.findUnique({
    where: { id: raw },
    select: { id: true, pinnedAt: true, lastActivityAt: true },
  });
  if (!legacy) throw new InvalidVoxListCursorError();
  return {
    id: legacy.id,
    pinnedAtMs: legacy.pinnedAt?.getTime() ?? null,
    lastActivityAtMs: legacy.lastActivityAt.getTime(),
  };
};

/**
 * Keyset on the list order: stable even when the cursor's vox gets activity (moves up) or is
 * deleted between pages, which breaks Prisma's `cursor: { id }`.
 */
const whereAfterCursor = (cursor: VoxListCursor, pinnedFirst: boolean): Prisma.VoxWhereInput => {
  const lastActivityAt = new Date(cursor.lastActivityAtMs);
  const afterInActivityOrder: Prisma.VoxWhereInput[] = [
    { lastActivityAt: { lt: lastActivityAt } },
    { lastActivityAt, id: { lt: cursor.id } },
  ];
  if (!pinnedFirst) return { OR: afterInActivityOrder };
  if (cursor.pinnedAtMs === null) {
    return { pinnedAt: null, OR: afterInActivityOrder };
  }
  const pinnedAt = new Date(cursor.pinnedAtMs);
  return {
    OR: [
      { pinnedAt: null },
      { pinnedAt: { lt: pinnedAt } },
      { pinnedAt, OR: afterInActivityOrder },
    ],
  };
};

export const listVoxListItems = async (options: {
  sessionUserId?: string | null;
  view?: VoxListView;
  cursor?: string | null;
  limit?: number;
  /** Exact category name as stored (e.g. "General"); only for `view === "default"`. */
  category?: string | null;
}): Promise<VoxListPage> => {
  const view: VoxListView = options.view ?? "default";
  const uid = options.sessionUserId ?? null;
  if (view === "hidden" && !uid) {
    return { items: [], nextCursor: null, hasMore: false };
  }
  if ((view === "favorites" || view === "mine") && !uid) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const whereParts: Prisma.VoxWhereInput[] = [{ deletedAt: null }];

  if (view === "hidden" && uid) {
    whereParts.push({ hiddenBy: { some: { userId: uid } } });
  } else if (view === "default") {
    if (uid) {
      whereParts.push({ NOT: { hiddenBy: { some: { userId: uid } } } });
    }
  } else if (view === "favorites" && uid) {
    whereParts.push({ favoritedBy: { some: { userId: uid } } });
  } else if (view === "mine" && uid) {
    whereParts.push({ ownerId: uid });
  }

  const categoryTrim = options.category?.trim();
  if (view === "default" && categoryTrim) {
    whereParts.push({ category: categoryTrim });
  }

  const pinnedFirst = view === "default";
  if (options.cursor) {
    whereParts.push(whereAfterCursor(await resolveListCursor(options.cursor), pinnedFirst));
  }

  const limit = clampPageLimit(options.limit, {
    max: VOX_LIST_PAGE_MAX,
    fallback: VOX_LIST_PAGE_SIZE,
  });
  const orderBy = pinnedFirst
    ? ([
        { pinnedAt: { sort: "desc", nulls: "last" } },
        { lastActivityAt: "desc" },
        { id: "desc" },
      ] satisfies Prisma.VoxOrderByWithRelationInput[])
    : ([{ lastActivityAt: "desc" }, { id: "desc" }] satisfies Prisma.VoxOrderByWithRelationInput[]);
  const rows = (await prisma.vox.findMany({
    where: { AND: whereParts },
    orderBy,
    take: limit + 1,
    select: voxListSelect(uid),
  })) as VoxListRow[];

  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeVoxListCursor({
          id: last.id,
          pinnedAtMs: pinnedFirst ? (last.pinnedAt?.getTime() ?? null) : null,
          lastActivityAtMs: last.lastActivityAt.getTime(),
        })
      : null;

  const pageVoxIds = pageRows.map((v) => v.id);
  const repliesByVoxId = new Map<string, number>();
  if (pageVoxIds.length > 0) {
    const commentCounts = await prisma.comment.groupBy({
      by: ["voxId"],
      where: {
        voxId: { in: pageVoxIds },
        deletedAt: null,
      },
      _count: { _all: true },
    });
    for (const c of commentCounts) {
      repliesByVoxId.set(c.voxId, c._count._all);
    }
  }

  return {
    items: pageRows.map((v) => mapVoxRowToListItem(v, uid, repliesByVoxId.get(v.id) ?? 0)),
    nextCursor,
    hasMore,
  };
};
