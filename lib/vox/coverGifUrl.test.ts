import { describe, expect, it } from "vitest";
import { coverGifUrlFromVoxMedia } from "./coverGifUrl";

describe("coverGifUrlFromVoxMedia", () => {
  it("returns the URL only for an IMAGE whose path ends in .gif", () => {
    expect(coverGifUrlFromVoxMedia("IMAGE", "https://x/u.gif")).toBe("https://x/u.gif");
    expect(coverGifUrlFromVoxMedia("IMAGE", "https://x/u.GIF?v=1")).toBe("https://x/u.GIF?v=1");
  });

  it("returns null for video, YouTube or a non-GIF image", () => {
    expect(coverGifUrlFromVoxMedia("UPLOADED_VIDEO", "https://x/v.mp4")).toBeNull();
    expect(coverGifUrlFromVoxMedia("YOUTUBE", null)).toBeNull();
    expect(coverGifUrlFromVoxMedia("IMAGE", "https://x/u.webp")).toBeNull();
    expect(coverGifUrlFromVoxMedia("IMAGE", null)).toBeNull();
  });
});
