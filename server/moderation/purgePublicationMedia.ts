import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { emitToVoxRoom } from "@/server/realtime/broadcast";
import {
  collectManagedUploadUrlsFromCommentSnapshot,
  collectManagedUploadUrlsFromVoxSnapshot,
} from "@/server/media/uploadUrls";
import { purgeManagedUploadUrlsNow } from "@/server/media/cleanupUnreferencedUploadUrls";

export type PurgePublicationMediaResult =
  | { ok: true; voxId: string; commentIds: string[]; blockedHashes: number }
  | { ok: false; kind: "not_found" };

/** `blockHashes` keeps the hash as a tombstone so later uploads of the same bytes are refused. */
export type PurgePublicationMediaOptions = { blockHashes?: boolean };

export const staffPurgeVoxPublicationMedia = async (
  voxId: string,
  db: PrismaClient = prisma,
  options: PurgePublicationMediaOptions = {},
): Promise<PurgePublicationMediaResult> => {
  const vox = await db.vox.findUnique({
    where: { id: voxId },
    select: {
      id: true,
      mediaType: true,
      mediaUrl: true,
      thumbnailUrl: true,
      comments: { select: { id: true, imageUrl: true, videoUrl: true, videoPosterUrl: true } },
    },
  });
  if (!vox) return { ok: false, kind: "not_found" };

  const urls = collectManagedUploadUrlsFromVoxSnapshot(vox);
  const commentIds = vox.comments.map((c) => c.id);

  await db.$transaction([
    db.vox.update({
      where: { id: voxId },
      data: { mediaUrl: null, thumbnailUrl: null, youtubeVideoId: null },
    }),
    db.comment.updateMany({
      where: { voxId },
      data: { imageUrl: null, videoUrl: null, videoPosterUrl: null },
    }),
  ]);

  const { blockedHashes } = await purgeManagedUploadUrlsNow(urls, db, {
    blockHashes: options.blockHashes,
  });
  await emitToVoxRoom(voxId, "vox:updated", { voxId });

  return { ok: true, voxId, commentIds, blockedHashes };
};

export const staffPurgeCommentPublicationMedia = async (
  commentId: string,
  db: PrismaClient = prisma,
  options: PurgePublicationMediaOptions = {},
): Promise<PurgePublicationMediaResult> => {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      voxId: true,
      imageUrl: true,
      videoUrl: true,
      videoPosterUrl: true,
    },
  });
  if (!comment) return { ok: false, kind: "not_found" };

  const urls = collectManagedUploadUrlsFromCommentSnapshot(comment);

  await db.comment.update({
    where: { id: commentId },
    data: { imageUrl: null, videoUrl: null, videoPosterUrl: null },
  });

  const { blockedHashes } = await purgeManagedUploadUrlsNow(urls, db, {
    blockHashes: options.blockHashes,
  });
  await emitToVoxRoom(comment.voxId, "vox:updated", { voxId: comment.voxId });

  return { ok: true, voxId: comment.voxId, commentIds: [commentId], blockedHashes };
};
