import type { CommentPublic } from "@/lib/vox/types";

/** Rough height for @tanstack/react-virtual before the DOM is measured (avoids jumpy overlaps). */
export const estimateCommentRowHeight = (c: CommentPublic | undefined): number => {
  if (!c) return 152;
  const headerAndPadding = 92;
  const bodyLines = Math.max(1, c.body.split("\n").length);
  const bodyBlock = Math.min(220, bodyLines * 20 + (c.body.length > 200 ? 40 : 0));
  const taggedBar = 28;
  const repliesRow = 36;
  let h = headerAndPadding + bodyBlock + taggedBar + repliesRow;
  if (c.imageUrl || c.videoUrl) {
    h += 240;
  }
  return Math.min(Math.max(h, 120), 520);
};
