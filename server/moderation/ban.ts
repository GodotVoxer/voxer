import { voxModerationSnapshot } from "@/server/moderation/publicationSnapshots";
import {
  commentModerationSnapshot,
  moderationCommentInclude,
} from "@/server/moderation/commentSnapshot";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import {
  broadcastVoxActivity,
  broadcastVoxBulkDeleted,
  emitToVoxRoom,
} from "@/server/realtime/broadcast";
import { countActiveCommentsForVox } from "@/server/vox/list";
import { computeBanEndsAt } from "@/lib/moderation/banEndsAt";
import type { DurationUnit } from "@/lib/time";
import { banContentWindowDurationMs, banContentWindowLabelEs } from "@/lib/moderation/contentBan";
import { canModerateTarget } from "@/lib/moderation/roleGuards";
import { resolveLatestClientIpHashForUser } from "@/server/moderation/resolveLatestClientIpHash";
import { invalidateVoxDetailCache } from "@/server/vox/getVoxDetailCached";
import { recomputeVoxLastActivity } from "@/server/vox/lastActivity";
import {
  authorCommentWhere,
  authorVoxWhere,
  bulkCutoffForBanContent,
  countAuthorContent,
  purgeAuthorPublicationMedia,
  type AuthorContentCounts,
  type BulkBanContentInput,
  type BulkContentMedia,
} from "@/server/moderation/authorContent";

export type { BulkBanContentInput, BulkContentMedia };

const bulkContentTargetDenied = async (
  actorUserId: string,
  targetUserId: string,
): Promise<"not_found" | "forbidden_target" | null> => {
  const [actor, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorUserId }, select: { role: true } }),
    prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } }),
  ]);
  if (!target) return "not_found";
  if (!actor || !canModerateTarget(actor.role, target.role, actorUserId === targetUserId)) {
    return "forbidden_target";
  }
  return null;
};

/** What a bulk delete with this window would reach, so staff sees it before confirming. */
export const previewBulkBanUserContent = async (
  actorUserId: string,
  targetUserId: string,
  contentBan: BulkBanContentInput,
): Promise<
  { ok: true; counts: AuthorContentCounts } | { ok: false; kind: "not_found" | "forbidden_target" }
> => {
  const denied = await bulkContentTargetDenied(actorUserId, targetUserId);
  if (denied) return { ok: false, kind: denied };
  return {
    ok: true,
    counts: await countAuthorContent(targetUserId, bulkCutoffForBanContent(contentBan)),
  };
};

export const staffBulkBanUserContent = async (
  actorUserId: string,
  targetUserId: string,
  contentBan: BulkBanContentInput,
  media: BulkContentMedia = "keep",
): Promise<
  | {
      ok: true;
      actionId: string;
      voxCount: number;
      commentCount: number;
      fileCount: number;
      blockedHashes: number;
    }
  | { ok: false; kind: "not_found" | "forbidden_target" }
> => {
  const denied = await bulkContentTargetDenied(actorUserId, targetUserId);
  if (denied) return { ok: false, kind: denied };
  const cutoff = bulkCutoffForBanContent(contentBan);
  const banContentLabelEsPayload =
    contentBan.kind === "forever"
      ? banContentWindowLabelEs(true)
      : banContentWindowLabelEs(false, contentBan.amount, contentBan.unit);
  const voxWhere = authorVoxWhere(targetUserId, cutoff);
  const commentWhere = authorCommentWhere(targetUserId, cutoff);
  const now = new Date();
  const bulkResult = await prisma.$transaction(async (tx) => {
    const voxRows = await tx.vox.findMany({ where: voxWhere });
    const commentRows = await tx.comment.findMany({
      where: commentWhere,
      include: moderationCommentInclude,
    });
    const voxIds = voxRows.map((v) => v.id);
    const commentIds = commentRows.map((c) => c.id);
    if (voxIds.length > 0) {
      await tx.vox.updateMany({
        where: { id: { in: voxIds } },
        data: { deletedAt: now, deletedByUserId: actorUserId },
      });
    }
    if (commentIds.length > 0) {
      await tx.comment.updateMany({
        where: { id: { in: commentIds } },
        data: { deletedAt: now, deletedByUserId: actorUserId },
      });
      await recomputeVoxLastActivity(
        tx,
        commentRows.map((c) => c.voxId),
      );
    }
    const a = await tx.moderationAction.create({
      data: {
        actorUserId,
        actionType: "BULK_SOFT_DELETE_USER_CONTENT",
        payload: {
          targetUserId,
          forever: contentBan.kind === "forever",
          ...(contentBan.kind === "relative"
            ? {
                amount: contentBan.amount,
                unit: contentBan.unit,
                durationMs: banContentWindowDurationMs(contentBan.amount, contentBan.unit),
              }
            : {}),
          banContentLabel: banContentLabelEsPayload,
          media,
          voxIds,
          commentIds,
          snapshots: [
            ...voxRows.map((vox) => ({
              kind: "vox",
              id: vox.id,
              authorUserId: vox.ownerId,
              vox: voxModerationSnapshot(vox),
            })),
            ...commentRows.map((comment) => ({
              kind: "comment",
              id: comment.id,
              authorUserId: comment.authorId,
              comment: { ...commentModerationSnapshot(comment), deletedAt: now.toISOString() },
            })),
          ],
        } as Prisma.InputJsonValue,
      },
    });
    return { a, voxCount: voxIds.length, commentCount: commentIds.length, voxIds, commentRows };
  });
  // After the soft delete, so the files stop being served once nothing can show them.
  const purged =
    media === "keep"
      ? { fileCount: 0, blockedHashes: 0, voxIds: [] }
      : await purgeAuthorPublicationMedia(targetUserId, cutoff, {
          blockHashes: media === "block",
        });
  if (media !== "keep") {
    await prisma.moderationAction.update({
      where: { id: bulkResult.a.id },
      data: {
        payload: {
          ...(bulkResult.a.payload as Prisma.JsonObject),
          purgedFiles: purged.fileCount,
          blockedHashes: purged.blockedHashes,
        },
      },
    });
  }
  const affectedVox = new Set<string>([
    ...bulkResult.voxIds,
    ...bulkResult.commentRows.map((c) => c.voxId),
  ]);
  for (const voxId of new Set([...bulkResult.voxIds, ...purged.voxIds])) {
    invalidateVoxDetailCache(voxId);
  }
  await broadcastVoxBulkDeleted(bulkResult.voxIds, "moderation");
  const commentOnlyVoxIds = [...affectedVox].filter((id) => !bulkResult.voxIds.includes(id));
  await Promise.all([
    ...[...affectedVox].map((vid) => emitToVoxRoom(vid, "vox:moderation-bulk", { voxId: vid })),
    ...commentOnlyVoxIds.map(async (vid) => {
      const replies = await countActiveCommentsForVox(vid);
      await broadcastVoxActivity(vid, replies);
    }),
  ]);
  return {
    ok: true,
    actionId: bulkResult.a.id,
    voxCount: bulkResult.voxCount,
    commentCount: bulkResult.commentCount,
    fileCount: purged.fileCount,
    blockedHashes: purged.blockedHashes,
  };
};

export const staffBanUser = async (
  actorUserId: string,
  targetUserId: string,
  reason: string,
  unit: DurationUnit,
  value: number,
  opts?: { blockClientNetwork?: boolean },
): Promise<
  | { ok: true; banId: string; actionId: string }
  | {
      ok: false;
      kind: "not_found" | "cannot_ban_self" | "no_client_network_fingerprint" | "forbidden_target";
    }
> => {
  if (actorUserId === targetUserId) {
    return { ok: false, kind: "cannot_ban_self" };
  }
  const [actor, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorUserId }, select: { role: true } }),
    prisma.user.findUnique({ where: { id: targetUserId }, select: { role: true } }),
  ]);
  if (!target) return { ok: false, kind: "not_found" };
  if (!actor || !canModerateTarget(actor.role, target.role)) {
    return { ok: false, kind: "forbidden_target" };
  }
  const blockClientNetwork = opts?.blockClientNetwork === true;
  let clientIpFingerprint: string | null = null;
  if (blockClientNetwork) {
    clientIpFingerprint = await resolveLatestClientIpHashForUser(targetUserId);
    if (!clientIpFingerprint) {
      return { ok: false, kind: "no_client_network_fingerprint" };
    }
  }
  const createdAt = new Date();
  const endsAt = computeBanEndsAt(createdAt, unit, value);
  const row = await prisma.$transaction(async (tx) => {
    const ban = await tx.userBan.create({
      data: {
        targetUserId,
        moderatorUserId: actorUserId,
        reason,
        endsAt,
      },
    });
    let clientIpBanId: string | undefined;
    if (blockClientNetwork && clientIpFingerprint) {
      const ipBan = await tx.clientIpBan.create({
        data: {
          ipHash: clientIpFingerprint,
          moderatorUserId: actorUserId,
          reason,
          endsAt,
        },
      });
      clientIpBanId = ipBan.id;
    }
    const action = await tx.moderationAction.create({
      data: {
        actorUserId,
        actionType: "BAN_USER",
        relatedBanId: ban.id,
        payload: {
          banId: ban.id,
          targetUserId,
          reason,
          unit,
          value,
          endsAt: endsAt?.toISOString() ?? null,
          ...(clientIpBanId ? { clientIpBanId, clientNetworkBlock: true as const } : {}),
        } as Prisma.InputJsonValue,
      },
    });
    return { ban, action };
  });
  return { ok: true, banId: row.ban.id, actionId: row.action.id };
};
