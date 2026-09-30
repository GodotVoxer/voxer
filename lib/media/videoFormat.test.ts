import { describe, expect, it } from "vitest";
import { videoContainerOf, videoMimeOf } from "./videoFormat";

describe("videoContainerOf", () => {
  it("recognizes WebM from a MIME type, a file name or an extension", () => {
    expect(videoContainerOf("video/webm; codecs=vp9")).toBe("webm");
    expect(videoContainerOf("incoming/2026/05/x.WEBM")).toBe("webm");
    expect(videoContainerOf("", "webm")).toBe("webm");
  });

  it("defaults to MP4", () => {
    expect(videoContainerOf("video/mp4")).toBe("mp4");
    expect(videoContainerOf("clip.mov")).toBe("mp4");
    expect(videoContainerOf(undefined)).toBe("mp4");
    expect(videoMimeOf("mp4")).toBe("video/mp4");
  });
});
