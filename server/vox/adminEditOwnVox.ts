import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { broadcastVoxEdited } from "@/server/realtime/broadcast";
import { invalidateVoxDetailCache } from "@/server/vox/getVoxDetailCached";

export type EditOwnVoxByAdminResult =
  | { ok: true; actionId: string; title: string; description: string }
  | { ok: false; kind: "not_admin" | "not_found" | "not_owner" | "unchanged" };

/** Title and description of the admin's own vox; ownership is checked against the session, not the role. */
export const editOwnVoxByAdmin = async (
  actorUserId: string,
  actorRole: UserRole,
  voxId: string,
  input: { title: string; description: string },
): Promise<EditOwnVoxByAdminResult> => {
  if (actorRole !== "ADMIN") {
    return { ok: false, kind: "not_admin" };
  }
  const existing = await prisma.vox.findFirst({
    where: { id: voxId, deletedAt: null },
    select: { id: true, ownerId: true, title: true, description: true },
  });
  if (!existing) {
    return { ok: false, kind: "not_found" };
  }
  if (!existing.ownerId || existing.ownerId !== actorUserId) {
    return { ok: false, kind: "not_owner" };
  }
  if (existing.title === input.title && existing.description === input.description) {
    return { ok: false, kind: "unchanged" };
  }

  const action = await prisma.$transaction(async (tx) => {
    await tx.vox.update({
      where: { id: existing.id },
      data: { title: input.title, description: input.description },
    });
    return tx.moderationAction.create({
      data: {
        actorUserId,
        actionType: "EDIT_VOX",
        payload: {
          voxId: existing.id,
          title: input.title,
          previousTitle: existing.title,
          previousDescription: existing.description,
        } as Prisma.InputJsonValue,
      },
    });
  });

  invalidateVoxDetailCache(voxId);
  await broadcastVoxEdited(voxId, { title: input.title, description: input.description });

  return { ok: true, actionId: action.id, title: input.title, description: input.description };
};
