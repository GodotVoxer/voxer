import type { ModerationActionRow } from "@/features/moderation/api";
import type {
  ModerationActionPreviewPage,
  ModerationPublicationPreview,
  ModerationVoxSnapshot,
} from "@/lib/moderation/actionPreviewTypes";
import type { ModerationCommentSnapshot } from "@/lib/moderation/commentSnapshotTypes";

const createdAt = "2026-09-26T12:00:00.000Z";
const vox: ModerationVoxSnapshot = {
  id: "moderation-vox",
  title:
    "Un título de vox muy largo que debe poder leerse completo en la vista previa sin quedar truncado",
  description: "Descripción completa del vox.\nSegunda línea del contenido original.",
  category: "General",
  mediaType: "IMAGE",
  mediaUrl: null,
  thumbnailUrl: null,
  animatedImage: false,
  youtubeVideoId: null,
  createdAt,
};
const comment: ModerationCommentSnapshot = {
  id: "moderation-comment",
  publicTag: "96QT70IF",
  voxId: vox.id,
  body: ">>2HKYR17U\n>Comentario original\nhttps://example.com/" + "a".repeat(200),
  displayName: "Anónimo",
  imageUrl: null,
  videoUrl: null,
  videoPosterUrl: null,
  avatarVariant: "BLUE",
  isOp: true,
  isMine: false,
  createdAt,
  deletedAt: createdAt,
  countryCode: "AR",
  threadTag: { text: "ABCD", badgeHue: 120 },
};
const row = (id: string, actionType: string, payload: unknown): ModerationActionRow => ({
  id,
  actionType,
  payload,
  createdAt,
  undoneAt: null,
  relatedBanId: null,
  actorUsername: "moderador_demo",
  actorRole: "MOD",
});
export const mockModerationActions = [
  row("demo-delete-comment", "DELETE_COMMENT", {
    commentId: comment.id,
    publicTag: comment.publicTag,
  }),
  row("demo-category", "RECATEGORIZE_VOX", {
    voxId: vox.id,
    title: vox.title,
    previousCategory: "General",
    newCategory: "Política",
  }),
  row("demo-bulk", "BULK_SOFT_DELETE_USER_CONTENT", {
    voxIds: ["bulk-vox"],
    commentIds: Array.from({ length: 11 }, (_, i) => "bulk-" + i),
    banContentLabel: "Todo el historial",
  }),
];
export const mockModerationPreview = (
  id: string,
  offset: number,
): ModerationActionPreviewPage | null => {
  let items: ModerationPublicationPreview[];
  if (id === "demo-delete-comment") items = [{ kind: "comment", id: comment.id, comment }];
  else if (id === "demo-category") items = [{ kind: "vox", id: vox.id, vox }];
  else if (id === "demo-bulk")
    items = [
      { kind: "vox", id: "bulk-vox", vox },
      ...Array.from({ length: 11 }, (_, i) => ({
        kind: "comment" as const,
        id: "bulk-" + i,
        comment: { ...comment, id: "bulk-" + i },
      })),
    ];
  else return null;
  return {
    items: items.slice(offset, offset + 10),
    total: items.length,
    nextOffset: offset + 10 < items.length ? offset + 10 : null,
  };
};
