export type WheelEventLike = {
  deltaY: number;
  deltaMode: number;
  wheelDelta?: number;
  wheelDeltaY?: number;
};

/** Line height for `deltaMode === 1` events; the standard constant of Chromium, Firefox and normalize-wheel. */
const LINE_HEIGHT_PX = 40;

/**
 * CSS pixels of one physical wheel notch. On macOS Blink/WebKit a wheel notch dispatches `deltaMode: 0`
 * with a tiny `deltaY` but a `wheelDelta` of 120; unnormalized, each notch scrolls about 4 px.
 */
const MOUSE_WHEEL_NOTCH_PX = 100;

/** A `wheel` event may come in pixels, lines or pages; callers always reason in pixels. */
export const wheelDeltaPixels = (e: WheelEventLike, viewportHeight: number): number => {
  if (e.deltaMode === 2) {
    return e.deltaY * viewportHeight;
  }

  if (e.deltaMode === 1) {
    return e.deltaY * LINE_HEIGHT_PX;
  }

  const legacyDelta = e.wheelDeltaY ?? e.wheelDelta;
  if (
    typeof legacyDelta === "number" &&
    Math.abs(legacyDelta) >= 120 &&
    Math.abs(legacyDelta) % 120 === 0 &&
    Math.abs(e.deltaY) < 40
  ) {
    const notches = Math.round(-legacyDelta / 120);
    return notches * MOUSE_WHEEL_NOTCH_PX;
  }

  return e.deltaY;
};
