import { unstable_cache } from "next/cache";
import { listVoxListItems, type VoxListPage } from "@/server/vox/list";

const PUBLIC_VOX_LIST_CACHE_SECONDS = 15;

/**
 * Without a session the first page of the main list is the same for everyone (no `favorited`, no
 * hidden filter), and it is the most requested query of the site. No invalidation tag on purpose:
 * the order changes with every comment (`lastActivityAt`), so event invalidation would defeat the
 * cache; the window is short and `feed:home` events keep a loaded grid current.
 */
export const getPublicVoxListFirstPage = (
  category: string | null,
  limit: number | undefined,
): Promise<VoxListPage> =>
  unstable_cache(
    () => listVoxListItems({ view: "default", category, limit }),
    ["vox-list-public-first-page", category ?? "", String(limit ?? "default")],
    { revalidate: PUBLIC_VOX_LIST_CACHE_SECONDS },
  )();
