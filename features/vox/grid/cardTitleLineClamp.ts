export const voxCardTitleLineClampFromHeights = (
  usableHeightPx: number,
  lineHeightPx: number,
): number => {
  if (!Number.isFinite(usableHeightPx) || !Number.isFinite(lineHeightPx)) return 2;
  if (usableHeightPx <= 0 || lineHeightPx <= 0) return 2;
  return Math.max(2, Math.min(99, Math.floor(usableHeightPx / lineHeightPx)));
};
