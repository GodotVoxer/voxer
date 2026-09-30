import { describe, expect, it } from "vitest";
import {
  CLIENT_IMAGE_SKIP_PROCESS_MAX_BYTES,
  CLIENT_IMAGE_UPLOAD_MAX_SIDE_PX,
  UPLOAD_IMAGE_MAX_SIDE_PX,
  UPLOAD_MAX_IMAGE_BYTES,
  UPLOAD_MAX_VIDEO_BYTES,
} from "@/lib/media/uploadLimits";
import { clientUploadSizeRejectionMessage } from "@/features/media/uploadClientGuard";

describe("upload-limits", () => {
  it("sets 20 MB for video and 10 MB for images", () => {
    expect(UPLOAD_MAX_VIDEO_BYTES).toBe(20 * 1024 * 1024);
    expect(UPLOAD_MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
    expect(UPLOAD_IMAGE_MAX_SIDE_PX).toBeGreaterThan(1000);
    expect(CLIENT_IMAGE_UPLOAD_MAX_SIDE_PX).toBeLessThanOrEqual(UPLOAD_IMAGE_MAX_SIDE_PX);
    expect(CLIENT_IMAGE_SKIP_PROCESS_MAX_BYTES).toBeGreaterThan(0);
  });
});

describe("clientUploadSizeRejectionMessage", () => {
  it("rejects a video over the maximum", () => {
    const f = new File([new Uint8Array(UPLOAD_MAX_VIDEO_BYTES + 1)], "a.mp4", {
      type: "video/mp4",
    });
    expect(clientUploadSizeRejectionMessage(f)).toMatch(/supera/);
  });
  it("accepts a video within the maximum", () => {
    const f = new File([new Uint8Array(1)], "a.mp4", { type: "video/mp4" });
    expect(clientUploadSizeRejectionMessage(f)).toBeNull();
  });
});
