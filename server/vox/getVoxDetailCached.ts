import { cache } from "react";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/server/db/prisma";
import { withViewerFlags, type VoxDetailApi } from "./getDetailApi";

const VOX_DETAIL_CACHE_SECONDS = 300;

const voxDetailCacheTag = (id: string): string => `vox-detail:${id}`;

const getVoxRowPersisted = (id: string) =>
  unstable_cache(() => prisma.vox.findUnique({ where: { id } }), ["vox-detail-row", id], {
    revalidate: VOX_DETAIL_CACHE_SECONDS,
    tags: [voxDetailCacheTag(id)],
  })();

const getVoxRowCached = cache(getVoxRowPersisted);

export const invalidateVoxDetailCache = (id: string): void => {
  revalidateTag(voxDetailCacheTag(id), { expire: 0 });
};

/**
 * `generateMetadata` (no session) and the page (with session) call with different arguments; the
 * vox row is cached separately by id so a render reads it once.
 */
export const getVoxDetailCached = cache(
  async (id: string, sessionUserId: string | null): Promise<VoxDetailApi | null> => {
    const vox = await getVoxRowCached(id);
    if (!vox || vox.deletedAt) return null;
    return withViewerFlags(vox, sessionUserId);
  },
);
