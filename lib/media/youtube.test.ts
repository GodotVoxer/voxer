import { describe, expect, it } from "vitest";
import {
  extractYoutubeVideoId,
  isYoutubeEmbedUrl,
  youtubeThumbnailUrl,
  youtubeWatchUrl,
} from "./youtube";
describe("extractYoutubeVideoId", () => {
  it("extracts the id from a watch URL", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });
  it("extracts the id from youtu.be", () => {
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts the id from shorts, live and /v/", () => {
    expect(extractYoutubeVideoId("https://youtube.com/shorts/LPnv8NQat0U")).toBe("LPnv8NQat0U");
    expect(extractYoutubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(extractYoutubeVideoId("https://www.youtube.com/live/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("https://www.youtube.com/v/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("extracts the id from watch URLs with parameters before v", () => {
    expect(extractYoutubeVideoId("https://m.youtube.com/watch?app=desktop&v=dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });
  it("accepts a bare id", () => {
    expect(extractYoutubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });
  it("returns null without a valid id", () => {
    expect(extractYoutubeVideoId("not-a-url")).toBeNull();
  });
});
describe("youtubeThumbnailUrl", () => {
  it("builds an hq URL by default", () => {
    expect(youtubeThumbnailUrl("dQw4w9WgXcQ")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    );
  });
  it("builds maxres when asked", () => {
    expect(youtubeThumbnailUrl("dQw4w9WgXcQ", "max")).toBe(
      "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    );
  });
});
describe("youtubeWatchUrl", () => {
  it("builds the watch page URL", () => {
    expect(youtubeWatchUrl("dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });
});
describe("isYoutubeEmbedUrl", () => {
  it("detects a standard embed", () => {
    expect(isYoutubeEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(true);
  });
  it("accepts query or hash", () => {
    expect(isYoutubeEmbedUrl("https://youtube.com/embed/dQw4w9WgXcQ?t=1")).toBe(true);
    expect(isYoutubeEmbedUrl("https://www.youtube.com/embed/dQw4w9WgXcQ#t=1")).toBe(true);
  });
  it("rejects watch and non-embed URLs", () => {
    expect(isYoutubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(false);
    expect(isYoutubeEmbedUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(false);
  });
});
