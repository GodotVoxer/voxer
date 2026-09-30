import { hidesAdminIdentity } from "@/lib/moderation/roles";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { toPublicComment } from "@/server/comments/serialize";
import type { ModerationCommentSnapshot } from "@/lib/moderation/commentSnapshotTypes";

export const getModerationCommentSnapshot = async (
  commentId: string,
  viewerUserId: string,
): Promise<{ ok: true; comment: ModerationCommentSnapshot } | { ok: false; kind: "not_found" }> => {
  const row = await prisma.comment.findUnique({
    where: { id: commentId },
    include: moderationCommentInclude,
  });
  if (!row || hidesAdminIdentity(row.author?.role, row.authorId, viewerUserId)) {
    return { ok: false, kind: "not_found" };
  }
  return {
    ok: true,
    comment: commentModerationSnapshot(row),
  };
};

export const moderationCommentInclude = {
  author: { select: { role: true } },
  vox: { select: { ownerId: true, threadUniqueIdsEnabled: true } },
  pollDisclosureOption: { select: { label: true, sortOrder: true } },
} as const;

export const commentModerationSnapshot = (
  row: Prisma.CommentGetPayload<{ include: typeof moderationCommentInclude }>,
): ModerationCommentSnapshot => ({
  ...toPublicComment(row, row.authorId != null && row.authorId === row.vox.ownerId, {
    threadIdsEnabled: row.vox.threadUniqueIdsEnabled,
  }),
  voxId: row.voxId,
  deletedAt: row.deletedAt?.toISOString() ?? null,
});
