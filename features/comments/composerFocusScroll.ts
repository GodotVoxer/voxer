type CommentComposerFocusBounds = {
  elementBottom: number;
  viewportBottom: number;
  gapPx?: number;
};

export const commentComposerFocusScrollDelta = ({
  elementBottom,
  viewportBottom,
  gapPx = 10,
}: CommentComposerFocusBounds): number => {
  const visibleBottom = viewportBottom - gapPx;
  if (elementBottom > visibleBottom) return elementBottom - visibleBottom;
  return 0;
};
