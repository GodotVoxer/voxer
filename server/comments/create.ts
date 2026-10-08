import type { CommentStaffBadge } from "@prisma/client";
import { after } from "next/server";
import { prisma } from "@/server/db/prisma";
import { createUniquePublicTag } from "@/server/comments/publicTag";
import { pickAvatarVariant } from "@/server/comments/avatarVariant";
import { sanitizePlainText } from "@/lib/format/plainText";
import { normalizeCommentBody } from "@/lib/comments/normalizeCommentBody";
import { broadcastVoxActivity, emitToUserRoom, emitToVoxRoom } from "@/server/realtime/broadcast";
import { countActiveCommentsForVox } from "@/server/vox/list";
import {
  extractDistinctReplyTagsInOrder,
  replyTagsErrorMessageEs,
  validateCommentReplyTags,
} from "@/lib/comments/replies";
import {
  COMMENT_BODY_MAX,
  COMMENT_CREATE_INTERVAL_MS,
  COMMENT_DISPLAY_NAME_MAX,
} from "@/lib/limits";
import { commentMediaIsUpload, resolveCommentMediaForCreate } from "@/server/comments/createMedia";
import { isUsableVideoPosterUrl } from "@/server/media/videoPosterPlaceholder";
import { createCommentSchema } from "@/lib/comments/schemas";
import type { z } from "zod";
import { ensureVoxThreadIdentity } from "@/server/comments/threadIdentity";
import { toPublicComment, type CommentPublicApi } from "./serialize";
import { buildCommentNotificationRows } from "@/server/notifications/recipients";
import { groupCommentPushRecipients } from "@/server/push/recipients";
import { sendPushToUserIds } from "@/server/push/send";
import { buildCommentPushPayload } from "@/server/push/payload";
import { PUSH_FANOUT_USERS_MAX } from "@/server/push/constants";
import {
  banToApiPayload,
  clientIpBanToApiPayload,
  type BanApiPayload,
} from "@/server/moderation/activeBan";
import { getPostingBlockForUser } from "@/server/moderation/postingEligibility";
import { isTextOnlyModeActive } from "@/server/moderation/textOnlyMode";
import { TEXT_ONLY_MODE_UPLOAD_MESSAGE_ES } from "@/lib/media/textOnlyMode";
import { hashClientIpFromRawHeaderValue } from "@/server/http/clientIpHash";
import { assertCommentCreateClientIpCooldown } from "@/server/posting/clientIpCreateCooldown";
import {
  PostingRateLimitError,
  postingRateLimitUserMessageEs,
} from "@/server/posting/postingRateLimitError";
import { isYoutubeEmbedUrl } from "@/lib/media/youtube";
import { isStaffRole } from "@/lib/moderation/roles";

export type CreateCommentParsed = z.infer<typeof createCommentSchema>;
export type CreateCommentResult =
  | {
      ok: true;
      payload: CommentPublicApi;
    }
  | {
      ok: false;
      kind:
        | "not_found"
        | "db_error"
        | "unavailable"
        | "bad_reply_tags"
        | "unauthorized"
        | "rate"
        | "banned"
        | "client_network_blocked"
        | "bad_media"
        | "bad_poll"
        | "text_only_mode";
      message?: string;
      ban?: BanApiPayload;
    };
export const createCommentOnVox = async (
  voxId: string,
  parsed: CreateCommentParsed,
  ctx: {
    userId: string;
    countryCode: string | null;
    clientIpRaw: string;
  },
): Promise<CreateCommentResult> => {
  const text = normalizeCommentBody(sanitizePlainText(parsed.body, COMMENT_BODY_MAX));
  const mediaResolved = resolveCommentMediaForCreate({
    imageUrl: parsed.imageUrl,
    videoUrl: parsed.videoUrl,
    youtubeUrl: parsed.youtubeUrl,
  });
  if (!mediaResolved.ok) {
    return { ok: false, kind: "bad_media", message: mediaResolved.message };
  }
  const imageUrl = mediaResolved.imageUrl;
  const videoUrl = mediaResolved.videoUrl;
  let videoPosterUrl: string | null = parsed.videoPosterUrl?.trim() || null;
  if (videoPosterUrl && !isUsableVideoPosterUrl(videoPosterUrl)) {
    return {
      ok: false,
      kind: "bad_media",
      message: "La miniatura de video tiene que provenir de una subida válida en el sitio.",
    };
  }
  if (!videoUrl) {
    videoPosterUrl = null;
  } else if (isYoutubeEmbedUrl(videoUrl)) {
    videoPosterUrl = null;
  }
  // A YouTube embed is never an uploaded animation, whatever the client claims.
  const animatedImage = Boolean(parsed.animatedImage && videoUrl && !isYoutubeEmbedUrl(videoUrl));
  const replyTagsDistinct = extractDistinctReplyTagsInOrder(text);
  try {
    const now = new Date();
    const clientIpHash = hashClientIpFromRawHeaderValue(ctx.clientIpRaw);
    const [postingBlock, vox] = await Promise.all([
      getPostingBlockForUser(ctx.userId, ctx.clientIpRaw),
      prisma.vox.findFirst({
        where: { id: voxId, deletedAt: null },
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          category: true,
          ownerId: true,
          threadUniqueIdsEnabled: true,
          countryFlagsEnabled: true,
          hasPoll: true,
          poll: {
            select: {
              id: true,
              options: { select: { id: true } },
            },
          },
        },
      }),
    ]);
    if (postingBlock?.kind === "user_ban") {
      return { ok: false, kind: "banned", ban: banToApiPayload(postingBlock.ban) };
    }
    if (postingBlock?.kind === "client_network") {
      return {
        ok: false,
        kind: "client_network_blocked",
        ban: clientIpBanToApiPayload(postingBlock.ban),
      };
    }
    // Also rejects files uploaded before the mode was turned on and published after.
    if (commentMediaIsUpload(mediaResolved) && (await isTextOnlyModeActive())) {
      return { ok: false, kind: "text_only_mode", message: TEXT_ONLY_MODE_UPLOAD_MESSAGE_ES };
    }
    if (!vox) return { ok: false, kind: "not_found" };
    const disclosureRaw = parsed.pollDisclosureOptionId?.trim() ?? "";
    const disclosureId = disclosureRaw.length > 0 ? disclosureRaw : null;
    if (disclosureId) {
      if (!vox.hasPoll || !vox.poll) {
        return {
          ok: false,
          kind: "bad_poll",
          message: "Este vox no admite voto en comentario.",
        };
      }
      const allowed = new Set(vox.poll.options.map((o) => o.id));
      if (!allowed.has(disclosureId)) {
        return {
          ok: false,
          kind: "bad_poll",
          message: "Opción de encuesta inválida.",
        };
      }
      const vote = await prisma.voxPollVote.findUnique({
        where: { userId_pollId: { userId: ctx.userId, pollId: vox.poll.id } },
        select: { optionId: true },
      });
      if (!vote || vote.optionId !== disclosureId) {
        return {
          ok: false,
          kind: "bad_poll",
          message: "Solo podés mostrar en el comentario una opción por la que ya votaste.",
        };
      }
    }
    const countryCodeToSave = vox.countryFlagsEnabled ? ctx.countryCode : null;
    const [publicTag, referencedParents] = await Promise.all([
      createUniquePublicTag(),
      replyTagsDistinct.length > 0
        ? prisma.comment.findMany({
            where: {
              voxId,
              deletedAt: null,
              publicTag: { in: replyTagsDistinct },
            },
            select: { id: true, publicTag: true, authorId: true, replyNotificationsMuted: true },
          })
        : Promise.resolve([]),
    ]);
    const existingPublicTagsUpper = new Set(
      referencedParents.map((c) => c.publicTag.toUpperCase()),
    );
    const tagErr = validateCommentReplyTags({
      newBody: text,
      existingPublicTagsUpper,
    });
    if (tagErr) {
      return {
        ok: false,
        kind: "bad_reply_tags",
        message: replyTagsErrorMessageEs(tagErr),
      };
    }
    const avatarVariant = pickAvatarVariant({ category: vox.category, now });
    const wantsStaffIdentity = parsed.showStaffIdentity === true;
    const parentByTagUpper = new Map(
      referencedParents.map((c) => [c.publicTag.toUpperCase(), c] as const),
    );
    const { created, notificationRows } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: ctx.userId },
        select: { username: true, lastCommentAt: true, role: true },
      });
      if (!user) {
        throw new Error("no_user");
      }
      const displayName = sanitizePlainText(user.username, COMMENT_DISPLAY_NAME_MAX);
      if (user.lastCommentAt) {
        const elapsed = now.getTime() - user.lastCommentAt.getTime();
        const remainingMs = COMMENT_CREATE_INTERVAL_MS - elapsed;
        if (remainingMs > 0) {
          throw new PostingRateLimitError("comment_user", Math.max(1, remainingMs));
        }
      }
      await assertCommentCreateClientIpCooldown(tx, { clientIpHash, now });
      let staffBadge: CommentStaffBadge | null = null;
      if (wantsStaffIdentity && isStaffRole(user.role)) {
        staffBadge = user.role === "ADMIN" ? "ADMIN" : "MOD";
      }
      let threadTagSave: string | null = null;
      let threadBadgeHueSave: number | null = null;
      if (vox.threadUniqueIdsEnabled) {
        const idRow = await ensureVoxThreadIdentity(tx, voxId, ctx.userId);
        threadTagSave = idRow.tag;
        threadBadgeHueSave = idRow.badgeHue;
      }
      const c = await tx.comment.create({
        data: {
          publicTag,
          voxId,
          body: text,
          displayName,
          imageUrl,
          videoUrl,
          videoPosterUrl,
          animatedImage,
          avatarVariant,
          staffBadge,
          authorId: ctx.userId,
          pollDisclosureOptionId: disclosureId,
          countryCode: countryCodeToSave,
          clientIpHash,
          threadTag: threadTagSave,
          threadBadgeHue: threadBadgeHueSave,
        },
      });
      await tx.vox.update({
        where: { id: voxId },
        data: { lastActivityAt: now },
      });
      await tx.user.update({
        where: { id: ctx.userId },
        data: {
          lastCommentAt: now,
          commentMediaUploadWindowStartAt: null,
          commentMediaUploadCountInWindow: 0,
        },
      });
      const follows = await tx.voxFollow.findMany({
        where: { voxId },
        select: { userId: true },
      });
      const followerUserIds = follows.map((f) => f.userId);
      const rows = buildCommentNotificationRows({
        voxTitle: vox.title,
        voxThumbnailUrl: vox.thumbnailUrl,
        voxOwnerId: vox.ownerId,
        newCommentAuthorId: ctx.userId,
        newCommentId: c.id,
        replyTagsDistinct,
        parentByTagUpper,
        followerUserIds,
      });
      if (rows.length > 0) {
        await tx.notification.createMany({
          data: rows.map((r) => ({
            userId: r.userId,
            type: r.type,
            voxId,
            actorUserId: r.actorUserId,
            relatedCommentId: r.relatedCommentId,
            message: r.message,
            thumbnailUrl: vox.thumbnailUrl,
          })),
        });
      }
      return { created: c, notificationRows: rows };
    });
    const isOp = vox.ownerId !== null && vox.ownerId === ctx.userId;
    const full = await prisma.comment.findUnique({
      where: { id: created.id },
      include: {
        pollDisclosureOption: { select: { label: true, sortOrder: true } },
      },
    });
    if (!full) {
      return { ok: false, kind: "db_error" };
    }
    const publicPayload = toPublicComment(full, isOp, {
      threadIdsEnabled: vox.threadUniqueIdsEnabled,
      viewerUserId: ctx.userId,
    });
    const commentForVoxRoom = toPublicComment(full, isOp, {
      threadIdsEnabled: vox.threadUniqueIdsEnabled,
      viewerUserId: null,
    });
    after(async () => {
      const replies = await countActiveCommentsForVox(voxId);
      await Promise.allSettled([
        broadcastVoxActivity(voxId, replies),
        emitToVoxRoom(voxId, "comment:created", commentForVoxRoom),
        emitToUserRoom(ctx.userId, "comment:created", publicPayload),
        ...notificationRows.map((row) =>
          emitToUserRoom(row.userId, "notification:new", {
            voxId,
            type: row.type,
          }),
        ),
        // One group per reason: each reason has its own notification title.
        ...groupCommentPushRecipients(notificationRows, {
          max: PUSH_FANOUT_USERS_MAX,
        }).map((group) =>
          sendPushToUserIds(
            group.userIds,
            buildCommentPushPayload({
              voxId,
              voxTitle: vox.title,
              voxCategory: vox.category,
              voxThumbnailUrl: vox.thumbnailUrl,
              commentPublicTag: full.publicTag,
              type: group.type,
            }),
          ),
        ),
      ]);
    });
    return { ok: true, payload: publicPayload };
  } catch (e) {
    if (e instanceof PostingRateLimitError) {
      return {
        ok: false,
        kind: "rate",
        message: postingRateLimitUserMessageEs(e.kind, e.remainingMs),
      };
    }
    if (e instanceof Error) {
      if (e.message.includes("VOXER_CLIENT_IP_PEPPER")) {
        console.error("[comment:create]", e.message);
        return { ok: false, kind: "unavailable" };
      }
      if (e.message === "no_user") {
        return { ok: false, kind: "unauthorized" };
      }
    }
    return { ok: false, kind: "db_error" };
  }
};
