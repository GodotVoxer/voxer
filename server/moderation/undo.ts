import { hasProtectedAdminTargets } from "@/server/moderation/protectedContent";
import { Prisma, type ModerationActionType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  broadcastCommentUpdated,
  broadcastVoxActivity,
  broadcastVoxCreated,
  broadcastVoxEdited,
  broadcastVoxUpdated,
  emitToVoxRoom,
} from "@/server/realtime/broadcast";
import { countActiveCommentsForVox, getVoxListItemById } from "@/server/vox/list";
import { canUndoModerationAction } from "@/lib/moderation/roleGuards";
import { invalidateVoxDetailCache } from "@/server/vox/getVoxDetailCached";
import { recomputeVoxLastActivity } from "@/server/vox/lastActivity";
import { toPublicComment } from "@/server/comments/serialize";
import { isStaffRole } from "@/lib/moderation/roles";

type ActionPayload = Record<string, unknown>;

const payloadObj = (p: Prisma.JsonValue): ActionPayload =>
  typeof p === "object" && p !== null && !Array.isArray(p) ? (p as ActionPayload) : {};

const broadcastRestoredCommentEdit = async (commentId: string): Promise<void> => {
  const row = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    include: {
      pollDisclosureOption: { select: { label: true, sortOrder: true } },
      vox: { select: { ownerId: true, threadUniqueIdsEnabled: true } },
    },
  });
  if (!row) return;
  const isOp = row.authorId !== null && row.authorId === row.vox.ownerId;
  await broadcastCommentUpdated(
    row.voxId,
    toPublicComment(row, isOp, { threadIdsEnabled: row.vox.threadUniqueIdsEnabled }),
  );
};

export const undoModerationAction = async (
  actionId: string,
  undoneByUserId: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      kind: "not_found" | "already_undone" | "unsupported" | "forbidden" | "forbidden_admin_action";
    }
> => {
  const staff = await prisma.user.findUnique({
    where: { id: undoneByUserId },
    select: { role: true },
  });
  if (!staff || !isStaffRole(staff.role)) {
    return { ok: false, kind: "forbidden" };
  }
  const action = await prisma.moderationAction.findUnique({
    where: { id: actionId },
    include: { actor: { select: { role: true } } },
  });
  if (!action) return { ok: false, kind: "not_found" };
  if (
    !canUndoModerationAction(staff.role, action.actor.role, action.actorUserId === undoneByUserId)
  ) {
    return { ok: false, kind: "forbidden_admin_action" };
  }
  if (action.undoneAt) return { ok: false, kind: "already_undone" };
  const supported: ModerationActionType[] = [
    "DELETE_VOX",
    "DELETE_COMMENT",
    "RECATEGORIZE_VOX",
    "EDIT_VOX",
    "EDIT_COMMENT",
    "BAN_USER",
    "BULK_SOFT_DELETE_USER_CONTENT",
  ];
  if (!supported.includes(action.actionType)) {
    return { ok: false, kind: "unsupported" };
  }
  const p = payloadObj(action.payload);
  // For `EDIT_COMMENT` the vox is only context: it may belong to another admin, and what gets
  // reverted is the admin's own comment.
  const voxTargets =
    action.actionType === "EDIT_COMMENT"
      ? []
      : typeof p.voxId === "string"
        ? [p.voxId]
        : Array.isArray(p.voxIds)
          ? p.voxIds.filter((id): id is string => typeof id === "string")
          : [];
  const commentTargets =
    typeof p.commentId === "string"
      ? [p.commentId]
      : Array.isArray(p.commentIds)
        ? p.commentIds.filter((id): id is string => typeof id === "string")
        : [];
  if (await hasProtectedAdminTargets(undoneByUserId, voxTargets, commentTargets)) {
    return { ok: false, kind: "forbidden" };
  }
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    switch (action.actionType) {
      case "DELETE_VOX": {
        const voxId = p.voxId as string;
        await tx.vox.updateMany({
          where: { id: voxId, deletedAt: { not: null } },
          data: { deletedAt: null, deletedByUserId: null },
        });
        break;
      }
      case "DELETE_COMMENT": {
        const commentId = p.commentId as string;
        await tx.comment.updateMany({
          where: { id: commentId, deletedAt: { not: null } },
          data: { deletedAt: null, deletedByUserId: null },
        });
        if (typeof p.voxId === "string") await recomputeVoxLastActivity(tx, [p.voxId]);
        break;
      }
      case "RECATEGORIZE_VOX": {
        const voxId = p.voxId as string;
        const previousCategory = p.previousCategory as string;
        // `updateMany`: a vox already hard-deleted by retention has nothing to revert.
        await tx.vox.updateMany({
          where: { id: voxId },
          data: { category: previousCategory },
        });
        break;
      }
      case "EDIT_VOX": {
        const voxId = p.voxId as string;
        const previousTitle = p.previousTitle as string;
        const previousDescription = p.previousDescription as string;
        if (typeof previousTitle === "string" && typeof previousDescription === "string") {
          // `updateMany`: a vox already hard-deleted by retention has nothing to revert.
          await tx.vox.updateMany({
            where: { id: voxId },
            data: { title: previousTitle, description: previousDescription },
          });
        }
        break;
      }
      case "EDIT_COMMENT": {
        const commentId = p.commentId as string;
        const previousBody = p.previousBody;
        const previousStaffBadge = p.previousStaffBadge;
        if (typeof previousBody === "string") {
          await tx.comment.updateMany({
            where: { id: commentId },
            data: {
              body: previousBody,
              staffBadge:
                previousStaffBadge === "ADMIN" || previousStaffBadge === "MOD"
                  ? previousStaffBadge
                  : null,
              hideOpBadge: p.previousHideOpBadge === true,
            },
          });
        }
        break;
      }
      case "BAN_USER": {
        const banId = (p.banId as string) ?? action.relatedBanId;
        if (banId) {
          await tx.userBan.updateMany({
            where: { id: banId, revokedAt: null },
            data: { revokedAt: now, revokedByUserId: undoneByUserId },
          });
        }
        const clientIpBanId = typeof p.clientIpBanId === "string" ? p.clientIpBanId : null;
        if (clientIpBanId) {
          await tx.clientIpBan.updateMany({
            where: { id: clientIpBanId, revokedAt: null },
            data: { revokedAt: now, revokedByUserId: undoneByUserId },
          });
        }
        break;
      }
      case "BULK_SOFT_DELETE_USER_CONTENT": {
        const voxIds = (p.voxIds as string[]) ?? [];
        const commentIds = (p.commentIds as string[]) ?? [];
        if (voxIds.length) {
          await tx.vox.updateMany({
            where: { id: { in: voxIds } },
            data: { deletedAt: null, deletedByUserId: null },
          });
        }
        if (commentIds.length) {
          await tx.comment.updateMany({
            where: { id: { in: commentIds } },
            data: { deletedAt: null, deletedByUserId: null },
          });
          const restored = await tx.comment.findMany({
            where: { id: { in: commentIds } },
            select: { voxId: true },
          });
          await recomputeVoxLastActivity(
            tx,
            restored.map((c) => c.voxId),
          );
        }
        break;
      }
      default:
        break;
    }
    await tx.moderationAction.update({
      where: { id: actionId },
      data: { undoneAt: now, undoneByUserId },
    });
  });
  const affectedVoxIds = new Set<string>();
  if (typeof p.voxId === "string") affectedVoxIds.add(p.voxId);
  if (action.actionType === "BULK_SOFT_DELETE_USER_CONTENT") {
    for (const voxId of (p.voxIds as string[]) ?? []) affectedVoxIds.add(voxId);
    const restoredComments = await prisma.comment.findMany({
      where: { id: { in: (p.commentIds as string[]) ?? [] } },
      select: { voxId: true },
    });
    for (const comment of restoredComments) affectedVoxIds.add(comment.voxId);
  }
  for (const voxId of affectedVoxIds) invalidateVoxDetailCache(voxId);
  const broadcastActiveReplies = async (voxId: string): Promise<void> => {
    await broadcastVoxActivity(voxId, await countActiveCommentsForVox(voxId));
  };
  const broadcastRestoredVoxToFeed = async (voxIds: readonly string[]): Promise<void> => {
    await Promise.all(
      voxIds.map(async (voxId) => {
        const item = await getVoxListItemById(voxId);
        if (item) await broadcastVoxCreated(item);
      }),
    );
  };
  try {
    if (action.actionType === "BULK_SOFT_DELETE_USER_CONTENT") {
      const voxIds = (p.voxIds as string[]) ?? [];
      const commentRows = await prisma.comment.findMany({
        where: { id: { in: (p.commentIds as string[]) ?? [] } },
        select: { voxId: true },
      });
      const rooms = new Set([...voxIds, ...commentRows.map((c) => c.voxId)]);
      await Promise.all([
        ...[...rooms].map((vid) => emitToVoxRoom(vid, "vox:moderation-bulk", { voxId: vid })),
        ...[...rooms].filter((vid) => !voxIds.includes(vid)).map(broadcastActiveReplies),
        broadcastRestoredVoxToFeed(voxIds),
      ]);
    }
    if (action.actionType === "DELETE_COMMENT") {
      const vid = p.voxId as string;
      const cid = p.commentId as string;
      if (vid && cid) {
        await Promise.all([
          emitToVoxRoom(vid, "comment:restored", { commentId: cid }),
          broadcastActiveReplies(vid),
        ]);
      }
    }
    if (action.actionType === "DELETE_VOX") {
      const vid = p.voxId as string;
      if (vid) {
        await Promise.all([
          emitToVoxRoom(vid, "vox:restored", { voxId: vid }),
          broadcastRestoredVoxToFeed([vid]),
        ]);
      }
    }
    if (action.actionType === "RECATEGORIZE_VOX") {
      const vid = p.voxId as string;
      const previousCategory = p.previousCategory as string;
      if (vid && previousCategory) {
        await broadcastVoxUpdated(vid, { category: previousCategory });
      }
    }
    if (action.actionType === "EDIT_COMMENT" && typeof p.commentId === "string") {
      await broadcastRestoredCommentEdit(p.commentId);
    }
    if (action.actionType === "EDIT_VOX") {
      const vid = p.voxId as string;
      const previousTitle = p.previousTitle as string;
      const previousDescription = p.previousDescription as string;
      if (vid && typeof previousTitle === "string" && typeof previousDescription === "string") {
        await broadcastVoxEdited(vid, {
          title: previousTitle,
          description: previousDescription,
        });
      }
    }
  } catch {
    /* best-effort: the undo already happened; clients resync over HTTP */
  }
  return { ok: true };
};
