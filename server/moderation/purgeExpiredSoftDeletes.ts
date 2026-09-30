import type { PrismaClient } from "@prisma/client";
import {
  collectManagedUploadUrlsFromVoxSnapshot,
  isManagedPublicUploadUrl,
} from "@/server/media/uploadUrls";
import { SOFT_DELETE_GRACE_MS } from "@/lib/moderation/constants";

export type PurgeExpiredSoftDeletesResult = {
  voxIds: string[];
  commentIds: string[];
  urls: string[];
};

/**
 * Hard-deletes vox and comments whose `deletedAt` is past the grace period. Runs outside the
 * create transaction and is idempotent: each delete swallows its error so concurrent runs do not
 * break each other, and whatever is left is finished by the next run. Comments of a soft-deleted
 * vox are skipped here; they go with the vox through the `Comment.voxId` cascade.
 */
export const purgeExpiredSoftDeletes = async (
  db: PrismaClient,
  now: Date,
  batchMax: number,
): Promise<PurgeExpiredSoftDeletesResult> => {
  const cutoff = new Date(now.getTime() - SOFT_DELETE_GRACE_MS);
  const urls = new Set<string>();
  const voxIds: string[] = [];
  const commentIds: string[] = [];

  const expiredVox = await db.vox.findMany({
    where: { deletedAt: { lte: cutoff } },
    take: batchMax,
    orderBy: { deletedAt: "asc" },
    select: {
      id: true,
      mediaType: true,
      mediaUrl: true,
      thumbnailUrl: true,
      comments: { select: { imageUrl: true, videoUrl: true, videoPosterUrl: true } },
    },
  });

  for (const v of expiredVox) {
    for (const u of collectManagedUploadUrlsFromVoxSnapshot(v)) urls.add(u);
    try {
      await db.vox.delete({ where: { id: v.id } });
      voxIds.push(v.id);
    } catch {
      /* already deleted by a concurrent run */
    }
  }

  const expiredComments = await db.comment.findMany({
    where: { deletedAt: { lte: cutoff }, vox: { deletedAt: null } },
    take: batchMax,
    orderBy: { deletedAt: "asc" },
    select: { id: true, imageUrl: true, videoUrl: true, videoPosterUrl: true },
  });
  for (const c of expiredComments) {
    if (isManagedPublicUploadUrl(c.imageUrl)) urls.add(c.imageUrl);
    if (isManagedPublicUploadUrl(c.videoUrl)) urls.add(c.videoUrl);
    if (isManagedPublicUploadUrl(c.videoPosterUrl)) urls.add(c.videoPosterUrl);
    try {
      await db.comment.delete({ where: { id: c.id } });
      commentIds.push(c.id);
    } catch {
      /* already deleted by a concurrent run */
    }
  }

  return { voxIds, commentIds, urls: [...urls] };
};
