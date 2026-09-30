import type { VoxListPage } from "@/lib/vox/types";
import { getPublicVoxListFirstPage } from "@/server/vox/getVoxListCached";
import { VOX_LIST_PAGE_SIZE } from "@/lib/limits";

/** First public page embedded in the home HTML. Fails open: without a database or on error the grid fetches it. */
export const loadInitialFeedPage = async (category: string | null): Promise<VoxListPage | null> => {
  if (!process.env.DATABASE_URL?.trim()) return null;
  // MSW demo: the grid must come from the mocks, not a real database.
  if (process.env.NEXT_PUBLIC_USE_MOCKS === "true") return null;
  try {
    const page = await getPublicVoxListFirstPage(category, VOX_LIST_PAGE_SIZE);
    // Same shape as the API JSON (dates as strings), which is what the store expects.
    return JSON.parse(JSON.stringify(page)) as VoxListPage;
  } catch {
    return null;
  }
};
