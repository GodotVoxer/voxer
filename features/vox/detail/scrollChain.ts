export type ScrollPaneMetrics = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

const maxScrollTop = (m: ScrollPaneMetrics): number => Math.max(0, m.scrollHeight - m.clientHeight);

/** Layout rounding: a panel 0.4 px from the bottom is at the bottom. */
const EDGE_TOLERANCE_PX = 1;

/**
 * At `lg` the detail has two independently scrolling columns and the wheel only moves the one under
 * the cursor. This chains them: the left column's excess moves the right one, and scrolling up first
 * returns the right one to its top. Returns the pixels for the chained panel, or `null` for the browser.
 */
export const chainedWheelDelta = (
  deltaPx: number,
  source: ScrollPaneMetrics,
  target: ScrollPaneMetrics,
): number | null => {
  if (deltaPx > 0) {
    if (maxScrollTop(source) - source.scrollTop > EDGE_TOLERANCE_PX) return null;
    const remaining = maxScrollTop(target) - target.scrollTop;
    if (remaining <= EDGE_TOLERANCE_PX) return null;
    return Math.min(deltaPx, remaining);
  }
  if (deltaPx < 0) {
    if (target.scrollTop <= 0) return null;
    return Math.max(deltaPx, -target.scrollTop);
  }
  return null;
};
