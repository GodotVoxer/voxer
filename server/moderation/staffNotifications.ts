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
