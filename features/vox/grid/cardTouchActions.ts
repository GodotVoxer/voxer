export const VOX_CARD_NAV_DATA_ATTR = "data-vox-card-nav";

export const shouldPinVoxCardActions = (pointerType: string) =>
  pointerType === "touch" || pointerType === "pen";

export const isSecondaryVoxCardLink = (anchor: Element) =>
  anchor.hasAttribute("href") && !anchor.hasAttribute(VOX_CARD_NAV_DATA_ATTR);

/** Tapping the card pins its actions, except on pills and secondary links. */
export const isVoxCardActionPinTarget = (
  target: Element | null,
  cardRoot: Element | null,
): boolean => {
  if (!target || !cardRoot || !cardRoot.contains(target)) return false;
  if (target.closest("button")) return false;
  const anchor = target.closest("a[href]");
  if (anchor && isSecondaryVoxCardLink(anchor)) return false;
  return true;
};
