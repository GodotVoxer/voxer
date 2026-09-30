import type { CommentStaffBadge, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { broadcastCommentUpdated } from "@/server/realtime/broadcast";
import { sanitizePlainText } from "@/lib/format/plainText";
import { COMMENT_BODY_MAX } from "@/lib/limits";
import {
  extractDistinctReplyTagsInOrder,
  replyTagsErrorMessageEs,
  validateCommentReplyTags,
} from "@/lib/comments/replies";
import { toPublicComment, type CommentPublicApi } from "./serialize";

export type EditOwnCommentInput = {
  body: string;
  showStaffIdentity: boolean;
  /** Honoured only when the author owns the vox. */
  showOpIdentity: boolean;
};

export type EditOwnCommentByAdminResult =
  | { ok: true; actionId: string; comment: CommentPublicApi }
  | { ok: false; kind: "not_admin" | "not_found" | "not_owner" | "unchanged" | "empty" }
  | { ok: false; kind: "bad_reply_tags"; message: string };

/**
 * An admin edits their own comment: text and visible identity (staff and OP badges). Ownership
 * is checked against the session, not the role, so an admin cannot rewrite someone else's comment.
 * No notifications are created: a `>>TAG` added while editing does not notify the quoted author.
 */
export const editOwnCommentByAdmin = async (
  actorUserId: string,
  actorRole: UserRole,
  commentId: string,
  input: EditOwnCommentInput,
): Promise<EditOwnCommentByAdminResult> => {
  if (actorRole !== "ADMIN") {
    return { ok: false, kind: "not_admin" };
  }
  const existing = await prisma.comment.findFirst({
    where: { id: commentId, deletedAt: null, vox: { deletedAt: null } },
    select: {
      id: true,
      voxId: true,
      publicTag: true,
      authorId: true,
      body: true,
      staffBadge: true,
      hideOpBadge: true,
      imageUrl: true,
      videoUrl: true,
      pollDisclosureOptionId: true,
      vox: { select: { ownerId: true, threadUniqueIdsEnabled: true } },
    },
  });
  if (!existing) {
    return { ok: false, kind: "not_found" };
  }
  if (!existing.authorId || existing.authorId !== actorUserId) {
    return { ok: false, kind: "not_owner" };
  }

  const body = sanitizePlainText(input.body, COMMENT_BODY_MAX);
  // Same rule as creating: an empty body needs media or a disclosed poll vote.
  if (!body && !existing.imageUrl && !existing.videoUrl && !existing.pollDisclosureOptionId) {
    return { ok: false, kind: "empty" };
  }
  const isVoxOwner = existing.vox.ownerId !== null && existing.vox.ownerId === actorUserId;
  const staffBadge: CommentStaffBadge | null = input.showStaffIdentity ? "ADMIN" : null;
  const hideOpBadge = isVoxOwner ? !input.showOpIdentity : existing.hideOpBadge;

  if (
    body === existing.body &&
    staffBadge === existing.staffBadge &&
    hideOpBadge === existing.hideOpBadge
  ) {
    return { ok: false, kind: "unchanged" };
  }

  if (body !== existing.body) {
    const tags = extractDistinctReplyTagsInOrder(body);
    const found =
      tags.length > 0
        ? await prisma.comment.findMany({
            where: { voxId: existing.voxId, deletedAt: null, publicTag: { in: tags } },
            select: { publicTag: true },
          })
        : [];
    const tagErr = validateCommentReplyTags({
      newBody: body,
      existingPublicTagsUpper: new Set(found.map((c) => c.publicTag.toUpperCase())),
    });
    if (tagErr) {
      return { ok: false, kind: "bad_reply_tags", message: replyTagsErrorMessageEs(tagErr) };
    }
  }

  const { updated, action } = await prisma.$transaction(async (tx) => {
    const updated = await tx.comment.update({
      where: { id: existing.id },
      data: { body, staffBadge, hideOpBadge },
      include: { pollDisclosureOption: { select: { label: true, sortOrder: true } } },
    });
    const action = await tx.moderationAction.create({
      data: {
        actorUserId,
        actionType: "EDIT_COMMENT",
        payload: {
          commentId: existing.id,
          voxId: existing.voxId,
          publicTag: existing.publicTag,
          previousBody: existing.body,
          previousStaffBadge: existing.staffBadge,
          previousHideOpBadge: existing.hideOpBadge,
        } as Prisma.InputJsonValue,
      },
    });
    return { updated, action };
  });

  const serializeOpts = { threadIdsEnabled: existing.vox.threadUniqueIdsEnabled };
  await broadcastCommentUpdated(
    existing.voxId,
    toPublicComment(updated, isVoxOwner, { ...serializeOpts, viewerUserId: null }),
  );

  return {
    ok: true,
    actionId: action.id,
    comment: toPublicComment(updated, isVoxOwner, { ...serializeOpts, viewerUserId: actorUserId }),
  };
};
