import { commentNotificationLine } from "@/lib/comments/notificationText";
import { NOTIFICATION_COMMENT_PREVIEW_MAX } from "@/lib/limits";
import { prisma } from "@/server/db/prisma";

export type StaffNotificationListItem = {
  id: string;
  message: string;
  thumbnailUrl: string | null;
  voxId: string;
  commentHash: string | null;
  readAt: string | null;
  createdAt: string;
  reportDetails?: string | null;
  /** The reported comment, while it exists. */
  commentPreview: string | null;
};

export const listStaffNotificationsForUser = async (
  userId: string,
  take = 50,
): Promise<StaffNotificationListItem[]> => {
  const rows = await prisma.staffNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      message: true,
      thumbnailUrl: true,
      voxId: true,
      commentHash: true,
      readAt: true,
      createdAt: true,
      report: {
        select: {
          details: true,
          comment: {
            select: {
              body: true,
              imageUrl: true,
              videoUrl: true,
              animatedImage: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    message: r.message,
    thumbnailUrl: r.thumbnailUrl,
    voxId: r.voxId,
    commentHash: r.commentHash,
    readAt: r.readAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    reportDetails: r.report?.details ?? null,
    commentPreview:
      r.report?.comment && !r.report.comment.deletedAt
        ? commentNotificationLine(r.report.comment, NOTIFICATION_COMMENT_PREVIEW_MAX)
        : null,
  }));
};

export const markStaffNotificationsReadForUserVox = async (
  userId: string,
  voxId: string,
): Promise<number> => {
  const r = await prisma.staffNotification.updateMany({
    where: { userId, voxId, readAt: null },
    data: { readAt: new Date() },
  });
  return r.count;
};

export const deleteAllStaffNotificationsForUser = async (userId: string): Promise<void> => {
  await prisma.staffNotification.deleteMany({ where: { userId } });
};

export const countUnreadStaffNotifications = async (userId: string): Promise<number> => {
  return prisma.staffNotification.count({
    where: { userId, readAt: null },
  });
};
