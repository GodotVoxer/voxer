type VerticalBounds = { top: number; bottom: number };

const DOCKED_VISIBLE_SHARE = 0.5;

export const isComposerSlotVisible = (slot: VerticalBounds, viewport: VerticalBounds): boolean => {
  const height = slot.bottom - slot.top;
  if (height <= 0) return false;
  const visible = Math.min(slot.bottom, viewport.bottom) - Math.max(slot.top, viewport.top);
  return visible >= height * DOCKED_VISIBLE_SHARE;
};

type Rect = { left: number; top: number; width: number; height: number };

/** Transform that makes `to`, scaled from its center, cover `from`. */
export const transformCoveringRect = (from: Rect, to: Rect): string => {
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  return `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`;
};

export const isRectOnScreen = (rect: Rect, viewport: { width: number; height: number }): boolean =>
  rect.width > 0 &&
  rect.height > 0 &&
  rect.left + rect.width > 0 &&
  rect.top + rect.height > 0 &&
  rect.left < viewport.width &&
  rect.top < viewport.height;
