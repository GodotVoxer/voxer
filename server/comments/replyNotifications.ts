import { prisma } from "@/server/db/prisma";

/** Author only; someone else's or a deleted comment is reported as missing. */
export const setCommentRepliesMuted = async (
  userId: string,
  commentId: string,
  muted: boolean,
): Promise<boolean> => {
  const { count } = await prisma.comment.updateMany({
    where: { id: commentId, authorId: userId, deletedAt: null },
    data: { replyNotificationsMuted: muted },
  });
  return count > 0;
};
