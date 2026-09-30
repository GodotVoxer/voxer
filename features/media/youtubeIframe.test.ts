import { describe, expect, it } from "vitest";
import { youtubeEmbedSrcFromUrl, youtubeNocookieEmbedSrc } from "./youtubeIframe";

describe("youtubeIframe", () => {
  it("builds a nocookie embed from an id", () => {
    expect(youtubeNocookieEmbedSrc("dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("normalizes a youtube.com embed URL", () => {
    expect(youtubeEmbedSrcFromUrl("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });
});
