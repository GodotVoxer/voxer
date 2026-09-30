import { hidesAdminIdentity } from "@/lib/moderation/roles";
import { prisma } from "@/server/db/prisma";

type AuthorLookup = { found: false } | { found: true; userId: string | null };

/** Registered owner of a live vox, for staff; `userId` is null when it must stay hidden. */
export const findVoxOwnerForStaff = async (
  voxId: string,
  viewerId: string,
): Promise<AuthorLookup> => {
  const row = await prisma.vox.findFirst({
    where: { id: voxId, deletedAt: null },
    select: { ownerId: true, owner: { select: { role: true } } },
  });
  if (!row) return { found: false };
  const hidden = hidesAdminIdentity(row.owner?.role, row.ownerId, viewerId);
  return { found: true, userId: hidden ? null : row.ownerId };
};

/** Author of a live comment, for staff; `userId` is null when it must stay hidden. */
export const findCommentAuthorForStaff = async (
  commentId: string,
  viewerId: string,
): Promise<AuthorLookup> => {
  const row = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { authorId: true, author: { select: { role: true } } },
  });
  if (!row) return { found: false };
  const hidden = hidesAdminIdentity(row.author?.role, row.authorId, viewerId);
  return { found: true, userId: hidden ? null : row.authorId };
};
