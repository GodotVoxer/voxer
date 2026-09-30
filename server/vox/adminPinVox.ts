import { voxModerationSnapshot } from "@/server/moderation/publicationSnapshots";
import { mayModeratePublication } from "@/server/moderation/protectedContent";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type ToggleVoxPinByAdminResult =
  | { ok: true; pinnedAt: string | null }
  | { ok: false; kind: "not_admin" | "not_found" };

export const toggleVoxPinByAdmin = async (
  actorUserId: string,
  actorRole: UserRole,
  voxId: string,
): Promise<ToggleVoxPinByAdminResult> => {
  if (actorRole !== "ADMIN") {
    return { ok: false, kind: "not_admin" };
  }
  if (!(await mayModeratePublication(actorUserId, { kind: "vox", id: voxId })))
    return { ok: false, kind: "not_admin" };
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.vox.findFirst({
      where: { id: voxId, deletedAt: null },
    });
    if (!existing) {
      return { ok: false as const, kind: "not_found" as const };
    }
    const pinning = existing.pinnedAt == null;
    const nextPinnedAt = pinning ? new Date() : null;
    const updated = await tx.vox.update({
      where: { id: existing.id },
      data: { pinnedAt: nextPinnedAt },
      select: { pinnedAt: true },
    });
    await tx.moderationAction.create({
      data: {
        actorUserId,
        actionType: pinning ? "PIN_VOX" : "UNPIN_VOX",
        payload: {
          voxId: existing.id,
          title: existing.title,
          snapshots: [
            {
              kind: "vox",
              id: existing.id,
              authorUserId: existing.ownerId,
              vox: voxModerationSnapshot(existing),
            },
          ],
        } as Prisma.InputJsonValue,
      },
    });
    return {
      ok: true as const,
      pinnedAt: updated.pinnedAt ? updated.pinnedAt.toISOString() : null,
    };
  });
  return result;
};
