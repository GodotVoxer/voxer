import { hidesAdminIdentity } from "@/lib/moderation/roles";
import { prisma } from "@/server/db/prisma";
import { moderationActionTargets } from "@/lib/moderation/actionTargets";
import { getModerationCommentSnapshot } from "@/server/moderation/commentSnapshot";
import { voxModerationSnapshot } from "@/server/moderation/publicationSnapshots";
import type {
  ModerationActionPreviewPage,
  ModerationPublicationPreview,
} from "@/lib/moderation/actionPreviewTypes";

export const getModerationActionPreview = async (
  actionId: string,
  viewerUserId: string,
  offset: number,
): Promise<ModerationActionPreviewPage | null> => {
  const action = await prisma.moderationAction.findUnique({
    where: { id: actionId },
    include: { actor: { select: { role: true } } },
  });
  if (!action) return null;
  const targets = moderationActionTargets(action.payload);
  const payload = action.payload as Record<string, unknown>;
  const snapshots = Array.isArray(payload?.snapshots)
    ? (payload.snapshots as (ModerationPublicationPreview & { authorUserId?: string | null })[])
    : [];
  const items = await Promise.all(
    targets
      .slice(offset, offset + 10)
      .map(async (target): Promise<ModerationPublicationPreview> => {
        const saved = snapshots.find((s) => s.kind === target.kind && s.id === target.id);
        if (saved?.authorUserId && saved.authorUserId !== viewerUserId) {
          const author = await prisma.user.findUnique({
            where: { id: saved.authorUserId },
            select: { role: true },
          });
          if (author?.role === "ADMIN")
            return target.kind === "vox"
              ? { kind: "vox", id: target.id, vox: null }
              : { kind: "comment", id: target.id, comment: null };
        }
        if (target.kind === "comment") {
          const owner = await prisma.comment.findUnique({
            where: { id: target.id },
            select: {
              authorId: true,
              author: { select: { role: true } },
              imageUrl: true,
              videoUrl: true,
              videoPosterUrl: true,
              animatedImage: true,
            },
          });
          if (owner && hidesAdminIdentity(owner.author?.role, owner.authorId, viewerUserId))
            return { ...target, kind: "comment", comment: null };
          if (saved?.kind === "comment")
            return {
              kind: "comment",
              id: saved.id,
              comment: saved.comment
                ? {
                    ...saved.comment,
                    imageUrl: owner?.imageUrl ?? null,
                    videoUrl: owner?.videoUrl ?? null,
                    videoPosterUrl: owner?.videoPosterUrl ?? null,
                    animatedImage: owner?.animatedImage ?? false,
                  }
                : null,
            };
          const result = await getModerationCommentSnapshot(target.id, viewerUserId);
          return { kind: "comment", id: target.id, comment: result.ok ? result.comment : null };
        }
        const row = await prisma.vox.findUnique({
          where: { id: target.id },
          include: { owner: { select: { role: true } } },
        });
        if (row && hidesAdminIdentity(row.owner?.role, row.ownerId, viewerUserId))
          return { kind: "vox", id: target.id, vox: null };
        if (saved?.kind === "vox")
          return {
            kind: "vox",
            id: saved.id,
            vox: saved.vox
              ? {
                  ...saved.vox,
                  mediaUrl: row?.mediaUrl ?? null,
                  thumbnailUrl: row?.thumbnailUrl ?? null,
                  youtubeVideoId: row?.youtubeVideoId ?? null,
                  animatedImage: row?.animatedImage ?? false,
                }
              : null,
          };
        return { kind: "vox", id: target.id, vox: row ? voxModerationSnapshot(row) : null };
      }),
  );
  return {
    items,
    total: targets.length,
    nextOffset: offset + 10 < targets.length ? offset + 10 : null,
  };
};
