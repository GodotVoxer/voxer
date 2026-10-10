import type { CommentPublic } from "@/lib/vox/types";

/**
 * Height for @tanstack/react-virtual before the DOM is measured. It is kept close to the real row: a
 * row that turns out different above the viewport makes the virtualizer correct the scroll, and on a
 * touch device every correction can cut the momentum.
 */
export const estimateCommentRowHeight = (c: CommentPublic | undefined, quoted = false): number => {
  if (!c) return 110;
  const headerAndPadding = 50;
  const bodyLines = Math.max(1, c.body.split("\n").length);
  const bodyBlock = Math.min(220, bodyLines * 20 + (c.body.length > 200 ? 40 : 0));
  let h = headerAndPadding + bodyBlock;
  // Quoted by other comments: the bar that lists them and the replies button.
  if (quoted) h += 60;
  if (c.imageUrl || c.videoUrl) {
    h += 240;
  }
  return Math.min(Math.max(h, 70), 520);
};
