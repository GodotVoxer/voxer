/** Viewer bounds: 1 is the whole image, uncropped. */
export const MEDIA_VIEWER_MIN_SCALE = 1;
export const MEDIA_VIEWER_MAX_SCALE = 8;
/** Double click or double tap step. */
export const MEDIA_VIEWER_STEP_SCALE = 2.5;

export type MediaViewerTransform = { scale: number; x: number; y: number };

export const MEDIA_VIEWER_IDENTITY: MediaViewerTransform = { scale: 1, x: 0, y: 0 };

export const clampMediaViewerScale = (scale: number): number =>
  Math.min(MEDIA_VIEWER_MAX_SCALE, Math.max(MEDIA_VIEWER_MIN_SCALE, scale));

type Size = { width: number; height: number };

/** Keeps the content touching the viewport; otherwise panning while zoomed can lose the image entirely. */
export const clampMediaViewerOffset = (
  transform: MediaViewerTransform,
  content: Size,
  viewport: Size,
): MediaViewerTransform => {
  const maxX = Math.max(0, (content.width * transform.scale - viewport.width) / 2);
  const maxY = Math.max(0, (content.height * transform.scale - viewport.height) / 2);
  return {
    scale: transform.scale,
    x: Math.min(maxX, Math.max(-maxX, transform.x)),
    y: Math.min(maxY, Math.max(-maxY, transform.y)),
  };
};

/** Scales keeping still the point under the cursor (or between two fingers); `focus` is relative to the viewport center. */
export const zoomMediaViewerAt = (
  transform: MediaViewerTransform,
  nextScaleRaw: number,
  focus: { x: number; y: number },
): MediaViewerTransform => {
  const nextScale = clampMediaViewerScale(nextScaleRaw);
  if (nextScale === MEDIA_VIEWER_MIN_SCALE) return MEDIA_VIEWER_IDENTITY;
  const ratio = nextScale / transform.scale;
  return {
    scale: nextScale,
    x: focus.x - (focus.x - transform.x) * ratio,
    y: focus.y - (focus.y - transform.y) * ratio,
  };
};
