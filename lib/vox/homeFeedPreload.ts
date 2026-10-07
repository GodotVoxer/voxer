import { VOX_LIST_PAGE_SIZE } from "@/lib/limits";

/** Must match byte for byte the first request of the home grid, or the browser downloads the feed twice. */
export const HOME_FEED_PRELOAD_HREF = `/api/vox?limit=${VOX_LIST_PAGE_SIZE}`;
