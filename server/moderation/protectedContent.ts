import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { canModerateTarget } from "@/lib/moderation/roleGuards";

const protectedAdminCommentsWhere = (actorUserId: string): Prisma.CommentWhereInput => ({
  author: { role: "ADMIN", id: { not: actorUserId } },
});

export const mayModeratePublication = async (
  actorUserId: string,
  target: { kind: "vox" | "comment"; id: string },
): Promise<boolean> => {
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { role: true },
  });
  if (!actor) return false;
  const owner =
    target.kind === "vox"
      ? (
          await prisma.vox.findUnique({
            where: { id: target.id },
            select: { owner: { select: { id: true, role: true } } },
          })
        )?.owner
      : (
          await prisma.comment.findUnique({
            where: { id: target.id },
            select: { author: { select: { id: true, role: true } } },
          })
        )?.author;
  if (!canModerateTarget(actor.role, owner?.role ?? null, owner?.id === actorUserId)) return false;
  return true;
};

export const hasProtectedAdminTargets = async (
  viewerUserId: string,
  voxIds: string[],
  commentIds: string[],
): Promise<boolean> => {
  const [vox, comment] = await Promise.all([
    voxIds.length
      ? prisma.vox.findFirst({
          where: { id: { in: voxIds }, owner: { role: "ADMIN", id: { not: viewerUserId } } },
          select: { id: true },
        })
      : null,
    commentIds.length
      ? prisma.comment.findFirst({
          where: { id: { in: commentIds }, ...protectedAdminCommentsWhere(viewerUserId) },
          select: { id: true },
        })
      : null,
  ]);
  return Boolean(vox || comment);
};
