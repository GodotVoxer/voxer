import { commentNotificationLine } from "@/lib/comments/notificationText";
import { NOTIFICATION_COMMENT_PREVIEW_MAX } from "@/lib/limits";
import { prisma } from "@/server/db/prisma";
export type NotificationListItem = {
  id: string;
  type: string;
  message: string;
  thumbnailUrl: string | null;
  voxId: string;
  commentPublicTag: string | null;
  /** Read on every listing, so a deleted comment stops showing and an edited one is current. */
  commentPreview: string | null;
  readAt: string | null;
  createdAt: string;
};
export const listNotificationsForUser = async (
  userId: string,
  take = 50,
): Promise<NotificationListItem[]> => {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      message: true,
      thumbnailUrl: true,
      voxId: true,
      readAt: true,
      createdAt: true,
      relatedComment: {
        select: {
          publicTag: true,
          body: true,
          imageUrl: true,
          videoUrl: true,
          animatedImage: true,
          deletedAt: true,
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    message: r.message,
    thumbnailUrl: r.thumbnailUrl,
    voxId: r.voxId,
    commentPublicTag: r.relatedComment?.publicTag ?? null,
    commentPreview:
      r.relatedComment && !r.relatedComment.deletedAt
        ? commentNotificationLine(r.relatedComment, NOTIFICATION_COMMENT_PREVIEW_MAX)
        : null,
    readAt: r.readAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
};

/**
 * With `seenThrough` only what the reader has had on screen is marked: notifications whose comment is
 * newer stay unread (`null`: no comment on screen), except those whose comment is gone and can no
 * longer be seen. Without it every notification of the vox is marked.
 */
export const markNotificationsReadForUserVox = async (
  userId: string,
  voxId: string,
  seenThrough?: Date | null,
): Promise<{ marked: number; remaining: number }> => {
  const unread = { userId, voxId, readAt: null };
  if (seenThrough === undefined) {
    const r = await prisma.notification.updateMany({
      where: unread,
      data: { readAt: new Date() },
    });
    return { marked: r.count, remaining: 0 };
  }
  const r = await prisma.notification.updateMany({
    where: {
      ...unread,
      OR: [
        { relatedCommentId: null },
        { relatedComment: { deletedAt: { not: null } } },
        ...(seenThrough ? [{ relatedComment: { createdAt: { lte: seenThrough } } }] : []),
      ],
    },
    data: { readAt: new Date() },
  });
  const remaining = await prisma.notification.count({ where: unread });
  return { marked: r.count, remaining };
};
export const deleteAllNotificationsForUser = async (userId: string): Promise<void> => {
  await prisma.notification.deleteMany({ where: { userId } });
};
