import { describe, expect, it } from "vitest";
import {
  MEDIA_VIEWER_IDENTITY,
  MEDIA_VIEWER_MAX_SCALE,
  clampMediaViewerOffset,
  clampMediaViewerScale,
  zoomMediaViewerAt,
} from "./viewerZoom";

describe("clampMediaViewerScale", () => {
  it("stays between 1 and the cap", () => {
    expect(clampMediaViewerScale(0.2)).toBe(1);
    expect(clampMediaViewerScale(99)).toBe(MEDIA_VIEWER_MAX_SCALE);
  });
});

describe("zoomMediaViewerAt", () => {
  it("keeps the point under the cursor still", () => {
    const next = zoomMediaViewerAt(MEDIA_VIEWER_IDENTITY, 2, { x: 100, y: 50 });
    expect(next).toEqual({ scale: 2, x: -100, y: -50 });
  });

  it("returning to 1 recenters: with the whole image visible there is nothing to pan", () => {
    const zoomed = zoomMediaViewerAt(MEDIA_VIEWER_IDENTITY, 3, { x: 80, y: 80 });
    expect(zoomMediaViewerAt(zoomed, 1, { x: 80, y: 80 })).toEqual(MEDIA_VIEWER_IDENTITY);
  });
});

describe("clampMediaViewerOffset", () => {
  it("does not let content be dragged out of the viewport", () => {
    const clamped = clampMediaViewerOffset(
      { scale: 2, x: 9999, y: -9999 },
      { width: 800, height: 600 },
      { width: 1000, height: 800 },
    );
    expect(clamped).toEqual({ scale: 2, x: 300, y: -200 });
  });

  it("centers the content without zoom", () => {
    expect(
      clampMediaViewerOffset(
        { scale: 1, x: 120, y: 40 },
        { width: 400, height: 300 },
        { width: 1000, height: 800 },
      ),
    ).toEqual(MEDIA_VIEWER_IDENTITY);
  });
});
