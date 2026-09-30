import { COMMENT_LIST_PAGE_MAX } from "@/lib/limits";
import type { CommentPublic } from "@/lib/vox/types";
import { fetchCommentsPage } from "@/features/vox/api";

const MAX_PAGES = 40;

export const loadAllCommentsForVox = async (voxId: string): Promise<CommentPublic[]> => {
  const accumulated: CommentPublic[] = [];
  let cursor: string | undefined;

  for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
    const { comments: page, nextCursor } = await fetchCommentsPage(voxId, {
      cursor,
      limit: COMMENT_LIST_PAGE_MAX,
    });
    accumulated.push(...page);
    if (!nextCursor) break;
    cursor = nextCursor;
  }

  return accumulated;
};
