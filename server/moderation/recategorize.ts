import { voxModerationSnapshot } from "@/server/moderation/publicationSnapshots";
import { mayModeratePublication } from "@/server/moderation/protectedContent";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { broadcastVoxUpdated } from "@/server/realtime/broadcast";
import { invalidateVoxDetailCache } from "@/server/vox/getVoxDetailCached";

export const staffRecategorizeVox = async (
  actorUserId: string,
  voxId: string,
  newCategory: string,
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
  const prev = vox.category;
  const action = await prisma.$transaction(async (tx) => {
    await tx.vox.update({
      where: { id: voxId },
      data: { category: newCategory },
    });
    return tx.moderationAction.create({
      data: {
        actorUserId,
        actionType: "RECATEGORIZE_VOX",
        payload: {
          voxId,
          title: vox.title,
          snapshots: [
            { kind: "vox", id: voxId, authorUserId: vox.ownerId, vox: voxModerationSnapshot(vox) },
          ],
          previousCategory: prev,
          newCategory,
        } as Prisma.InputJsonValue,
      },
    });
  });
  invalidateVoxDetailCache(voxId);
  await broadcastVoxUpdated(voxId, { category: newCategory });
  return { ok: true, actionId: action.id };
};
