/** Radix and `vaul` render their layers with `role="dialog"` (or `alertdialog`) and `data-state`, enough to detect open overlays. */
const OPEN_OVERLAY_SELECTOR =
  '[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]';

export const countOpenOverlays = (root: ParentNode): number =>
  root.querySelectorAll(OPEN_OVERLAY_SELECTOR).length;

export const hasOpenOverlay = (root: ParentNode): boolean => countOpenOverlays(root) > 0;
