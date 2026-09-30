import type { CommentPublic } from "@/lib/vox/types";

export const shouldShowRefHoverPreview = (
  resolved: CommentPublic | undefined,
  tagsAsPlainText: boolean,
  canHover: boolean,
): boolean => Boolean(resolved) && !tagsAsPlainText && canHover;
