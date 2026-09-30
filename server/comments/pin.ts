import { prisma } from "@/server/db/prisma";

export type SetCommentPinnedResult =
  | { ok: true; voxId: string; pinnedAt: string | null }
  | { ok: false };

/**
 * Only the vox owner pins comments on it, theirs or anyone's, with no limit. A comment that is not
 * on one of the user's live vox is reported as missing (404) so ownership is never revealed.
 */
export const setCommentPinned = async (
  userId: string,
  commentId: string,
  pinned: boolean,
): Promise<SetCommentPinnedResult> => {
  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      deletedAt: null,
      vox: { ownerId: userId, deletedAt: null },
    },
    select: { id: true, voxId: true },
  });
  if (!comment) return { ok: false };

  // Pinning an already pinned comment moves it to the top: the section sorts by `pinnedAt` desc.
  const pinnedAt = pinned ? new Date() : null;
  const { count } = await prisma.comment.updateMany({
    where: { id: comment.id, deletedAt: null },
    data: { pinnedAt },
  });
  if (count === 0) return { ok: false };

  return { ok: true, voxId: comment.voxId, pinnedAt: pinnedAt?.toISOString() ?? null };
};
