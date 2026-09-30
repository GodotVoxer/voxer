import { describe, expect, it } from "vitest";
import { mediaTypeForVoxFormPreview } from "./formPreviewMediaType";

describe("mediaTypeForVoxFormPreview", () => {
  it("prefers YouTube over a local video", () => {
    expect(mediaTypeForVoxFormPreview({ isYoutube: true, isLocalVideo: true })).toBe("YOUTUBE");
  });

  it("returns UPLOADED_VIDEO for a local video that is not YouTube", () => {
    expect(mediaTypeForVoxFormPreview({ isYoutube: false, isLocalVideo: true })).toBe(
      "UPLOADED_VIDEO",
    );
  });

  it("returns IMAGE without a video signal", () => {
    expect(mediaTypeForVoxFormPreview({ isYoutube: false, isLocalVideo: false })).toBe("IMAGE");
  });
});
