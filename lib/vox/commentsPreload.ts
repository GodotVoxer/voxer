import { COMMENT_LIST_PAGE_MAX } from "@/lib/limits";

/** Must match byte for byte the first request of `loadAllCommentsForVox`, or the browser downloads the comments twice. */
export const voxCommentsPreloadHref = (voxId: string): string =>
  `/api/vox/${voxId}/comments?limit=${COMMENT_LIST_PAGE_MAX}`;
