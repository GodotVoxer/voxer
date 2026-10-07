import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { banContentWindowDurationMs } from "@/lib/moderation/contentBan";
import type { DurationUnit } from "@/lib/time";
import {
  collectManagedUploadUrlsFromCommentSnapshot,
  collectManagedUploadUrlsFromVoxSnapshot,
} from "@/server/media/uploadUrls";
import { purgeManagedUploadUrlsNow } from "@/server/media/cleanupUnreferencedUploadUrls";

export type BulkBanContentInput =
  | { kind: "forever" }
  | { kind: "relative"; amount: number; unit: DurationUnit };

/** What happens to the files of the publications a bulk delete covers. */
export type BulkContentMedia = "keep" | "purge" | "block";

export const bulkCutoffForBanContent = (
  contentBan: BulkBanContentInput,
  now: number = Date.now(),
): Date | null => {
  if (contentBan.kind === "forever") return null;
  return new Date(now - banContentWindowDurationMs(contentBan.amount, contentBan.unit));
};

/**
 * `includeDeleted` is for the media: a publication staff already hid still serves its file by URL
 * until the soft delete expires.
 */
export const authorVoxWhere = (
  ownerId: string,
  cutoff: Date | null,
  opts: { includeDeleted?: boolean } = {},
): Prisma.VoxWhereInput => ({
  ownerId,
  ...(opts.includeDeleted ? {} : { deletedAt: null }),
  ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
});

export const authorCommentWhere = (
  authorId: string,
  cutoff: Date | null,
  opts: { includeDeleted?: boolean } = {},
): Prisma.CommentWhereInput => ({
  authorId,
  ...(opts.includeDeleted ? {} : { deletedAt: null }),
  ...(cutoff ? { createdAt: { gte: cutoff } } : {}),
});

const commentHasUploadWhere: Prisma.CommentWhereInput = {
  OR: [{ imageUrl: { not: null } }, { videoUrl: { not: null } }],
};

export type AuthorContentCounts = {
  voxCount: number;
  commentCount: number;
  /** Publications with an uploaded file, hidden ones included. */
  mediaCount: number;
};

export const countAuthorContent = async (
  authorId: string,
  cutoff: Date | null,
  db: PrismaClient = prisma,
): Promise<AuthorContentCounts> => {
  const [voxCount, commentCount, voxMedia, commentMedia] = await Promise.all([
    db.vox.count({ where: authorVoxWhere(authorId, cutoff) }),
    db.comment.count({ where: authorCommentWhere(authorId, cutoff) }),
    db.vox.count({
      where: {
        ...authorVoxWhere(authorId, cutoff, { includeDeleted: true }),
        mediaType: { not: "YOUTUBE" },
        mediaUrl: { not: null },
      },
    }),
    db.comment.count({
      where: {
        ...authorCommentWhere(authorId, cutoff, { includeDeleted: true }),
        ...commentHasUploadWhere,
      },
    }),
  ]);
  return { voxCount, commentCount, mediaCount: voxMedia + commentMedia };
};

/**
 * Same reach as purging each publication by hand: a vox takes the files of every comment in it.
 * Files another live publication shares through dedupe are kept, and therefore not blocked.
 */
export const purgeAuthorPublicationMedia = async (
  authorId: string,
  cutoff: Date | null,
  options: { blockHashes: boolean },
  db: PrismaClient = prisma,
): Promise<{ fileCount: number; blockedHashes: number; voxIds: string[] }> => {
  const [voxRows, commentRows] = await Promise.all([
    db.vox.findMany({
      where: authorVoxWhere(authorId, cutoff, { includeDeleted: true }),
      select: {
        id: true,
        mediaType: true,
        mediaUrl: true,
        thumbnailUrl: true,
        comments: { select: { imageUrl: true, videoUrl: true, videoPosterUrl: true } },
      },
    }),
    db.comment.findMany({
      where: {
        ...authorCommentWhere(authorId, cutoff, { includeDeleted: true }),
        ...commentHasUploadWhere,
      },
      select: { id: true, voxId: true, imageUrl: true, videoUrl: true, videoPosterUrl: true },
    }),
  ]);
  const urls = new Set<string>();
  for (const v of voxRows) {
    for (const u of collectManagedUploadUrlsFromVoxSnapshot(v)) urls.add(u);
  }
  for (const c of commentRows) {
    for (const u of collectManagedUploadUrlsFromCommentSnapshot(c)) urls.add(u);
  }
  const voxIds = voxRows.map((v) => v.id);
  const commentIds = commentRows.map((c) => c.id);
  if (voxIds.length > 0 || commentIds.length > 0) {
    await db.$transaction([
      db.vox.updateMany({
        where: { id: { in: voxIds } },
        data: { mediaUrl: null, thumbnailUrl: null, youtubeVideoId: null },
      }),
      db.comment.updateMany({
        where: { OR: [{ voxId: { in: voxIds } }, { id: { in: commentIds } }] },
        data: { imageUrl: null, videoUrl: null, videoPosterUrl: null },
      }),
    ]);
  }
  const { blockedHashes } = await purgeManagedUploadUrlsNow([...urls], db, {
    blockHashes: options.blockHashes,
  });
  const touchedVoxIds = [...new Set([...voxIds, ...commentRows.map((c) => c.voxId)])];
  return { fileCount: urls.size, blockedHashes, voxIds: touchedVoxIds };
};
