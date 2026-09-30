import type { VoxDetailApi } from "@/server/vox/getDetailApi";
import type { VoxDetail } from "@/lib/vox/types";

const toIso = (d: Date | string): string =>
  d instanceof Date ? d.toISOString() : typeof d === "string" ? d : String(d);

/** Public fields only: no author, owner or internal metadata. */
export const serializeVoxDetailForClient = (vox: VoxDetailApi): VoxDetail => {
  return {
    id: vox.id,
    title: vox.title,
    description: vox.description,
    category: vox.category,
    mediaType: vox.mediaType,
    mediaUrl: vox.mediaUrl,
    thumbnailUrl: vox.thumbnailUrl,
    animatedImage: vox.animatedImage,
    youtubeVideoId: vox.youtubeVideoId,
    createdAt: toIso(vox.createdAt),
    updatedAt: toIso(vox.updatedAt),
    following: vox.following,
    hidden: vox.hidden,
    favorited: vox.favorited,
    isOwner: vox.isOwner,
    threadUniqueIdsEnabled: vox.threadUniqueIdsEnabled,
    countryFlagsEnabled: vox.countryFlagsEnabled,
    hasPoll: vox.hasPoll,
    poll: null,
  };
};
