import { prisma } from "@/server/db/prisma";
export type NotificationListItem = {
  id: string;
  type: string;
  message: string;
  thumbnailUrl: string | null;
  voxId: string;
  commentPublicTag: string | null;
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
        select: { publicTag: true },
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
    readAt: r.readAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
};

export const markNotificationsReadForUserVox = async (
  userId: string,
  voxId: string,
): Promise<number> => {
  const r = await prisma.notification.updateMany({
    where: { userId, voxId, readAt: null },
    data: { readAt: new Date() },
  });
  return r.count;
};
export const deleteAllNotificationsForUser = async (userId: string): Promise<void> => {
  await prisma.notification.deleteMany({ where: { userId } });
};
