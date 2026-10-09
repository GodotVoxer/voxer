import { voxModerationSnapshot } from "@/server/moderation/publicationSnapshots";
import {
  commentModerationSnapshot,
  moderationCommentInclude,
} from "@/server/moderation/commentSnapshot";
import { mayModeratePublication } from "@/server/moderation/protectedContent";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  broadcastVoxActivity,
  broadcastVoxDeleted,
  emitToVoxRoom,
} from "@/server/realtime/broadcast";
import { countActiveCommentsForVox } from "@/server/vox/list";
import { invalidateVoxDetailCache } from "@/server/vox/getVoxDetailCached";
import { recomputeVoxLastActivity } from "@/server/vox/lastActivity";

export const staffSoftDeleteVox = async (
  actorUserId: string,
  voxId: string,
): Promise<
  { ok: true; actionId: string } | { ok: false; kind: "not_found" | "gone" | "forbidden_target" }
> => {
  if (!(await mayModeratePublication(actorUserId, { kind: "vox", id: voxId })))
    return { ok: false, kind: "forbidden_target" };
  const vox = await prisma.vox.findFirst({
    where: { id: voxId, deletedAt: null },
  });
  if (!vox) {
    const gone = await prisma.vox.findUnique({ where: { id: voxId }, select: { id: true } });
    return gone ? { ok: false, kind: "gone" } : { ok: false, kind: "not_found" };
  }
  const action = await prisma.$transaction(async (tx) => {
    await tx.vox.update({
      where: { id: voxId },
      data: { deletedAt: new Date(), deletedByUserId: actorUserId },
    });
    return tx.moderationAction.create({
      data: {
        actorUserId,
        actionType: "DELETE_VOX",
        payload: {
          voxId,
          title: vox.title,
          snapshots: [
            { kind: "vox", id: voxId, authorUserId: vox.ownerId, vox: voxModerationSnapshot(vox) },
          ],
        } as Prisma.InputJsonValue,
      },
    });
  });
  invalidateVoxDetailCache(voxId);
  await broadcastVoxDeleted(voxId, "moderation");
  return { ok: true, actionId: action.id };
};

export const staffSoftDeleteComment = async (
  actorUserId: string,
  commentId: string,
): Promise<
  | { ok: true; actionId: string; voxId: string }
  | { ok: false; kind: "not_found" | "gone" | "forbidden_target" }
> => {
  if (!(await mayModeratePublication(actorUserId, { kind: "comment", id: commentId })))
    return { ok: false, kind: "forbidden_target" };
  const c = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    include: moderationCommentInclude,
  });
  if (!c) {
    const gone = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    return gone ? { ok: false, kind: "gone" } : { ok: false, kind: "not_found" };
  }
  const action = await prisma.$transaction(async (tx) => {
    await tx.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date(), deletedByUserId: actorUserId },
    });
    await recomputeVoxLastActivity(tx, [c.voxId]);
    return tx.moderationAction.create({
      data: {
        actorUserId,
        actionType: "DELETE_COMMENT",
        payload: {
          commentId,
          voxId: c.voxId,
          publicTag: c.publicTag,
          snapshots: [
            {
              kind: "comment",
              id: commentId,
              authorUserId: c.authorId,
              comment: { ...commentModerationSnapshot(c), deletedAt: new Date().toISOString() },
            },
          ],
        } as Prisma.InputJsonValue,
      },
    });
  });
  await emitToVoxRoom(c.voxId, "comment:deleted", { commentId });
  const replies = await countActiveCommentsForVox(c.voxId);
  await broadcastVoxActivity(c.voxId, replies);
  return { ok: true, actionId: action.id, voxId: c.voxId };
};
