import type { Vox } from "@prisma/client";
import type { ModerationVoxSnapshot } from "@/lib/moderation/actionPreviewTypes";

export const voxModerationSnapshot = (vox: Vox): ModerationVoxSnapshot => ({
  id: vox.id,
  title: vox.title,
  description: vox.description,
  category: vox.category,
  mediaType: vox.mediaType,
  mediaUrl: vox.mediaUrl,
  thumbnailUrl: vox.thumbnailUrl,
  animatedImage: vox.animatedImage,
  youtubeVideoId: vox.youtubeVideoId,
  createdAt: vox.createdAt.toISOString(),
});
